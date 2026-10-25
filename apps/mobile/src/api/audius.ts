import { env } from '@/lib/env';
import type { PlayableTrack } from '@/player/store';

/**
 * Música actual de Audius, la red abierta de artistas independientes, a través de nuestra función
 * `music-now` (caché y filtro de canciones que se pueden escuchar). El audio se pide directamente
 * a Audius, así la escucha cuenta para el artista allí.
 */
export interface AudiusTrack {
  id: string;
  title: string;
  artist: string;
  handle: string | null;
  verified: boolean;
  genre: string | null;
  durationMs: number;
  plays: number;
  artwork: string | null;
  artworkLarge: string | null;
  url: string;
  streamUrl: string;
}

/** Géneros de Audius con su nombre en español, en el orden en que se muestran. */
export const AUDIUS_GENRES = [
  { key: null, label: 'Todo' },
  { key: 'Latin', label: 'Latino' },
  { key: 'Hip-Hop/Rap', label: 'Rap' },
  { key: 'Electronic', label: 'Electrónica' },
  { key: 'House', label: 'House' },
  { key: 'Pop', label: 'Pop' },
  { key: 'R&B/Soul', label: 'R&B' },
  { key: 'Lo-Fi', label: 'Lo-fi' },
] as const;

export type AudiusGenre = (typeof AUDIUS_GENRES)[number]['key'];

async function call(params: Record<string, string>): Promise<AudiusTrack[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${env.supabaseUrl}/functions/v1/music-now?${qs}`, {
    headers: { apikey: env.supabaseKey },
  });
  if (!res.ok) throw new Error('ordyx:network');
  const body = (await res.json()) as { data?: AudiusTrack[] };
  return body.data ?? [];
}

export const getTrendingNow = (genre: AudiusGenre = null, limit = 20) =>
  call({ view: 'trending', limit: String(limit), ...(genre ? { genre } : {}) });

export const getUndergroundNow = (limit = 20) =>
  call({ view: 'underground', limit: String(limit) });

export const searchAudius = (q: string, limit = 10) =>
  call({ view: 'search', q, limit: String(limit) });

/** Prefijo de las canciones de Audius dentro del reproductor (no son filas de nuestra base). */
export const AUDIUS_PREFIX = 'audius:';
export const isExternal = (id: string) => id.startsWith(AUDIUS_PREFIX);

export function audiusToPlayable(t: AudiusTrack): PlayableTrack {
  return {
    id: `${AUDIUS_PREFIX}${t.id}`,
    title: t.title,
    artistName: t.artist,
    artistId: null,
    coverUrl: t.artworkLarge ?? t.artwork,
    audioPath: `${AUDIUS_PREFIX}${t.id}`,
    durationMs: t.durationMs || null,
    isDemo: false,
    externalUrl: t.url,
    genre: t.genre,
  };
}

export function audiusStreamUrl(audioPath: string) {
  const id = audioPath.slice(AUDIUS_PREFIX.length);
  return `https://api.audius.co/v1/tracks/${encodeURIComponent(id)}/stream?app_name=AurevixMusic`;
}
