import { createAudioPlayer } from 'expo-audio';

/**
 * Obtiene la duración de un archivo de audio local cargándolo (sin reproducirlo).
 * El servidor la acepta como dato del cliente; en producción debe confirmarla el worker de
 * procesamiento (ffprobe) descrito en docs/AUDIO_PIPELINE.md.
 */
export function probeDurationMs(uri: string, timeoutMs = 15_000): Promise<number | null> {
  return new Promise((resolve) => {
    const player = createAudioPlayer({ uri });
    const done = (value: number | null) => {
      clearTimeout(timer);
      sub.remove();
      player.remove();
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.isLoaded && s.duration > 0) done(Math.round(s.duration * 1000));
    });
  });
}
