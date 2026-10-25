/**
 * Worker de transcodificación de Ordyx.
 *
 * Bucle: reclama un trabajo (`claim_transcode_job`, con bloqueo SKIP LOCKED) → descarga el original
 * a disco → ffprobe (validación y duración real) → ffmpeg (AAC 128 kbps, −14 LUFS) → sube la versión
 * de streaming → `complete_transcode_job`. En caso de error: `fail_transcode_job` (reintento o, si
 * el archivo es inválido, vuelta a borrador con aviso al artista).
 *
 * Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (solo en el servidor del worker),
 *            POLL_INTERVAL_MS (opcional, 15000 por defecto).
 * Activación: app_config.transcoding_enabled = true (desde el panel → Configuración).
 */
import { createClient } from '@supabase/supabase-js';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PermanentMediaError, probe, streamPathFor, transcodeToStream } from './media.ts';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const POLL = Number(process.env.POLL_INTERVAL_MS ?? 15_000);
let stopping = false;

interface Job {
  track_id: string;
  owner_id: string;
  audio_path: string;
  audio_mime: string | null;
  attempt: number;
}

const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }));

async function downloadTo(path: string, file: string) {
  // URL firmada de corta duración + descarga en streaming a disco (sin cargar el archivo en memoria).
  const { data, error } = await supabase.storage.from('audio').createSignedUrl(path, 600);
  if (error || !data) throw error ?? new Error('No se pudo firmar la URL del original');
  const res = await fetch(data.signedUrl);
  if (!res.ok || !res.body) throw new Error(`Descarga del original: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), createWriteStream(file));
}

export async function processJob(job: Job) {
  const dir = await mkdtemp(join(tmpdir(), 'ordyx-'));
  const input = join(dir, 'original');
  const output = join(dir, 'stream.m4a');
  try {
    log('job:start', { track: job.track_id, attempt: job.attempt });
    await downloadTo(job.audio_path, input);
    const info = await probe(input);
    log('job:probe', { track: job.track_id, ...info });
    const { sizeBytes } = await transcodeToStream(input, output, info.durationMs);
    const streamPath = streamPathFor(job.audio_path);
    const up = await supabase.storage.from('audio').upload(streamPath, await readFile(output), {
      contentType: 'audio/mp4',
      upsert: true,
      cacheControl: '31536000',
    });
    if (up.error) throw up.error;
    const { data, error } = await supabase.rpc('complete_transcode_job', {
      p_track_id: job.track_id,
      p_stream_path: streamPath,
      p_stream_mime: 'audio/mp4',
      p_stream_size: sizeBytes,
      p_duration_ms: info.durationMs,
    });
    if (error) throw error;
    log('job:done', { track: job.track_id, status: data, sizeBytes });
  } catch (e) {
    const permanent = e instanceof PermanentMediaError;
    const message = e instanceof Error ? e.message : String(e);
    log('job:error', { track: job.track_id, permanent, message });
    const { error } = await supabase.rpc('fail_transcode_job', { p_track_id: job.track_id, p_error: message, p_permanent: permanent });
    if (error) log('job:fail-report-error', { message: error.message });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function loop(once: boolean) {
  while (!stopping) {
    const { data, error } = await supabase.rpc('claim_transcode_job');
    if (error) {
      log('claim:error', { message: error.message });
    } else if (Array.isArray(data) && data.length > 0) {
      await processJob(data[0] as Job);
      continue; // puede haber más trabajos pendientes
    }
    if (once) break;
    await new Promise((r) => setTimeout(r, POLL));
  }
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => (stopping = true));
await loop(process.argv.includes('--once'));
