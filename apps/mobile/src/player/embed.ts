/**
 * Canciones de YouTube y SoundCloud dentro del reproductor de Aurevix. Sus condiciones exigen que
 * suenen con su reproductor oficial y a la vista, así que no pasan por el <audio> de la app: el
 * reproductor oficial se muestra en el sitio de la portada (pantalla del reproductor) y los botones
 * de Aurevix lo controlan a través de este registro. Si el reproductor no está a la vista (pantalla
 * minimizada), la canción queda en pausa.
 */
import type { PlayableTrack } from './store';

export type EmbedKind = 'youtube' | 'soundcloud';
export const YT_PREFIX = 'youtube:';
export const SC_PREFIX = 'soundcloud:';

export function embedOf(
  t: Pick<PlayableTrack, 'audioPath'> | null | undefined,
): { kind: EmbedKind; ref: string } | null {
  if (!t) return null;
  if (t.audioPath.startsWith(YT_PREFIX))
    return { kind: 'youtube', ref: t.audioPath.slice(YT_PREFIX.length) };
  if (t.audioPath.startsWith(SC_PREFIX))
    return { kind: 'soundcloud', ref: t.audioPath.slice(SC_PREFIX.length) };
  return null;
}

export interface EmbedEngine {
  load(ref: string, autoplay: boolean): void;
  play(): void;
  pause(): void;
  seek(ms: number): void;
}

let engine: EmbedEngine | null = null;
let pending: { ref: string; autoplay: boolean } | null = null;

/** Al montarse: carga lo pendiente o, si no hay nada, deja preparada la canción actual. */
export function registerEmbedEngine(e: EmbedEngine, currentRef: string | null) {
  engine = e;
  if (pending) {
    e.load(pending.ref, pending.autoplay);
    pending = null;
  } else if (currentRef) e.load(currentRef, false);
}

export function unregisterEmbedEngine(e: EmbedEngine) {
  if (engine === e) engine = null;
}

export const embedEngine = () => engine;

/** Pide cargar una canción; si el reproductor oficial aún no está montado, se carga al montarse. */
export function loadEmbed(ref: string, autoplay: boolean) {
  if (engine) engine.load(ref, autoplay);
  else pending = { ref, autoplay };
}

export function youtubeToPlayable(v: {
  id: string;
  title: string;
  artist: string | null;
  thumbnail: string | null;
}): PlayableTrack {
  return {
    id: `${YT_PREFIX}${v.id}`,
    title: v.title,
    artistName: v.artist ?? 'YouTube',
    artistId: null,
    coverUrl: v.thumbnail ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    audioPath: `${YT_PREFIX}${v.id}`,
    durationMs: null,
    isDemo: false,
    externalUrl: `https://www.youtube.com/watch?v=${v.id}`,
  };
}

export function soundcloudToPlayable(v: {
  url: string;
  title: string;
  artist: string | null;
  thumbnail: string | null;
}): PlayableTrack {
  return {
    id: `${SC_PREFIX}${v.url}`,
    title: v.title,
    artistName: v.artist ?? 'SoundCloud',
    artistId: null,
    coverUrl: v.thumbnail,
    audioPath: `${SC_PREFIX}${v.url}`,
    durationMs: null,
    isDemo: false,
    externalUrl: v.url,
  };
}

// La pantalla del reproductor la abre la navegación de la app (se registra en (app)/_layout).
let showPlayer: (() => void) | null = null;
export function setShowPlayerHandler(fn: (() => void) | null) {
  showPlayer = fn;
}
/** Sin el reproductor oficial a la vista no puede sonar: se pide abrir la pantalla del reproductor. */
export function requestPlayerScreen() {
  showPlayer?.();
}
