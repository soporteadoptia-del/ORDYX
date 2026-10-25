import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { PermanentMediaError, probe, streamPathFor, transcodeToStream } from '../src/media.ts';

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'transcoder-test-'));
  // Señal de prueba real: 5 s de tono a 22,05 kHz mono en WAV.
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=5:sample_rate=22050', '-ac', '1', join(dir, 'tone.wav')]);
  await writeFile(join(dir, 'not-audio.mp3'), 'esto no es audio');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=duration=0.3', join(dir, 'short.wav')]);
});
after(() => rm(dir, { recursive: true, force: true }));

test('ffprobe mide la duración real', async () => {
  const info = await probe(join(dir, 'tone.wav'));
  assert.ok(Math.abs(info.durationMs - 5000) < 50, `duración ${info.durationMs}`);
  assert.equal(info.channels, 1);
});

test('genera AAC 128 kbps estéreo 44,1 kHz con la misma duración', async () => {
  const out = join(dir, 'stream.m4a');
  const { sizeBytes } = await transcodeToStream(join(dir, 'tone.wav'), out, 5000);
  assert.ok(sizeBytes > 10_000);
  const info = await probe(out);
  assert.equal(info.codec, 'aac');
  assert.equal(info.sampleRate, 44100);
  assert.equal(info.channels, 2);
  assert.ok(Math.abs(info.durationMs - 5000) < 150, `duración ${info.durationMs}`);
  // faststart: el índice (moov) va antes de los datos (mdat) para empezar a reproducir sin descargar todo.
  const bytes = await readFile(out);
  assert.ok(bytes.indexOf('moov') < bytes.indexOf('mdat'), 'moov debe ir antes de mdat');
});

test('un archivo que no es audio es un error permanente', async () => {
  await assert.rejects(probe(join(dir, 'not-audio.mp3')), PermanentMediaError);
});

test('un audio de menos de 1 s se rechaza', async () => {
  await assert.rejects(probe(join(dir, 'short.wav')), /menos de 1 segundo/);
});

test('ruta de streaming junto al original', () => {
  assert.equal(streamPathFor('uid/track/original.wav'), 'uid/track/stream_aac_128.m4a');
  assert.throws(() => streamPathFor('raro.wav'), PermanentMediaError);
});
