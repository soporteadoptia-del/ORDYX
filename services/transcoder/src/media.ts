/**
 * Operaciones de audio con ffprobe/ffmpeg. No dependen de Supabase, así que se prueban con archivos reales.
 */
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';

export interface ProbeResult {
  durationMs: number;
  codec: string;
  sampleRate: number;
  channels: number;
  formatName: string;
}

/** Error que no se arregla reintentando (archivo dañado, sin pista de audio, demasiado largo…). */
export class PermanentMediaError extends Error {
  override name = 'PermanentMediaError';
}

export const LIMITS = { minMs: 1_000, maxMs: 4 * 60 * 60 * 1000 } as const;

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr = (stderr + d.toString()).slice(-8000)));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

export async function probe(file: string): Promise<ProbeResult> {
  const { stdout, code, stderr } = await run(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-select_streams', 'a:0', file],
    60_000,
  );
  if (code !== 0) throw new PermanentMediaError(`ffprobe no reconoce el archivo: ${stderr.trim().slice(0, 300)}`);
  const data = JSON.parse(stdout) as {
    streams?: { codec_name?: string; sample_rate?: string; channels?: number; duration?: string }[];
    format?: { duration?: string; format_name?: string };
  };
  const stream = data.streams?.[0];
  if (!stream) throw new PermanentMediaError('El archivo no contiene ninguna pista de audio');
  const seconds = Number(stream.duration ?? data.format?.duration ?? NaN);
  if (!Number.isFinite(seconds)) throw new PermanentMediaError('No se puede determinar la duración');
  const durationMs = Math.round(seconds * 1000);
  if (durationMs < LIMITS.minMs) throw new PermanentMediaError('El audio dura menos de 1 segundo');
  if (durationMs > LIMITS.maxMs) throw new PermanentMediaError('El audio supera las 4 horas');
  return {
    durationMs,
    codec: stream.codec_name ?? 'desconocido',
    sampleRate: Number(stream.sample_rate ?? 0),
    channels: stream.channels ?? 0,
    formatName: data.format?.format_name ?? '',
  };
}

/**
 * Genera la versión de streaming: AAC-LC 128 kbps estéreo 44,1 kHz en contenedor MP4 con `faststart`
 * (el índice al principio permite empezar a reproducir sin descargar el archivo completo) y volumen
 * normalizado a −14 LUFS, el nivel habitual de las plataformas de streaming.
 */
export async function transcodeToStream(input: string, output: string, durationMs: number): Promise<{ sizeBytes: number }> {
  const timeout = Math.max(120_000, durationMs * 2);
  const { code, stderr } = await run(
    'ffmpeg',
    [
      '-hide_banner', '-nostdin', '-y',
      '-i', input,
      '-map', '0:a:0', '-vn', '-sn', '-dn',
      '-map_metadata', '-1',
      '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11',
      '-ar', '44100', '-ac', '2',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      '-f', 'mp4',
      output,
    ],
    timeout,
  );
  if (code !== 0) throw new Error(`ffmpeg falló (${code}): ${stderr.trim().slice(-500)}`);
  const { size } = await stat(output);
  if (size <= 0) throw new Error('ffmpeg generó un archivo vacío');
  return { sizeBytes: size };
}

/** Ruta de la versión de streaming junto al original: {uid}/{track}/stream_aac_128.m4a */
export function streamPathFor(originalPath: string): string {
  const parts = originalPath.split('/');
  if (parts.length < 3) throw new PermanentMediaError(`Ruta de audio inesperada: ${originalPath}`);
  return `${parts[0]}/${parts[1]}/stream_aac_128.m4a`;
}
