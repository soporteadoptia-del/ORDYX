/**
 * Catálogo de la comunidad: lo que cualquiera importa (YouTube, SoundCloud, Audius) queda a la
 * vista de todo el mundo en Inicio y en el buscador. Solo se guardan enlaces y datos públicos.
 */
import { AUDIUS_PREFIX } from '@/api/audius';
import { supabase } from '@/lib/supabase';
import { embedOf, soundcloudToPlayable, youtubeCover, youtubeToPlayable } from '@/player/embed';
import type { PlayableTrack } from '@/player/store';
import { unwrap } from './client';

export interface ExternalTrack {
  id: string;
  source: 'youtube' | 'soundcloud' | 'audius';
  ref: string;
  title: string;
  artist: string | null;
  cover_url: string | null;
  import_count: number;
}

export function externalToPlayable(t: ExternalTrack): PlayableTrack {
  if (t.source === 'youtube')
    return youtubeToPlayable({
      id: t.ref,
      title: t.title,
      artist: t.artist,
      thumbnail: t.cover_url,
    });
  if (t.source === 'soundcloud')
    return soundcloudToPlayable({
      url: t.ref,
      title: t.title,
      artist: t.artist,
      thumbnail: t.cover_url,
    });
  return {
    id: `${AUDIUS_PREFIX}${t.ref}`,
    title: t.title,
    artistName: t.artist ?? 'Audius',
    artistId: null,
    coverUrl: t.cover_url,
    audioPath: `${AUDIUS_PREFIX}${t.ref}`,
    durationMs: null,
    isDemo: false,
    externalUrl: `https://audius.co/tracks/${t.ref}`,
  };
}

/** Guarda en el catálogo común las canciones de YouTube, SoundCloud y Audius de una importación. */
export async function registerImported(tracks: PlayableTrack[]) {
  const items = tracks
    .map((t) => {
      const e = embedOf(t);
      if (e)
        return {
          source: e.kind,
          ref: e.ref,
          title: t.title,
          artist: t.artistName,
          cover_url: t.coverUrl,
        };
      if (t.audioPath.startsWith(AUDIUS_PREFIX))
        return {
          source: 'audius',
          ref: t.audioPath.slice(AUDIUS_PREFIX.length),
          title: t.title,
          artist: t.artistName,
          cover_url: t.coverUrl,
        };
      return null;
    })
    .filter(Boolean)
    .slice(0, 100);
  if (!items.length) return;
  await supabase.rpc('register_external_tracks', { p_items: items });
}

export async function getCommunityTracks(limit = 20): Promise<ExternalTrack[]> {
  return unwrap(
    await supabase
      .from('external_tracks')
      .select('id,source,ref,title,artist,cover_url,import_count')
      .eq('is_hidden', false)
      .order('import_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as ExternalTrack[];
}

export async function searchCommunity(q: string): Promise<ExternalTrack[]> {
  return unwrap(
    await supabase.rpc('search_external_tracks', { p_query: q, p_limit: 12 }),
  ) as ExternalTrack[];
}

export { youtubeCover };
