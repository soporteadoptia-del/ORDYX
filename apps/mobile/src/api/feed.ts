import { supabase } from '@/lib/supabase';
import { unwrap } from './client';
import { currentUserId } from './library';
import { TRACK_FIELDS, type TrackListItem } from './types';

export interface FeedItem {
  kind: 'release' | 'repost';
  track_id: string;
  actor_id: string;
  actor_name: string;
  actor_username: string | null;
  actor_image: string | null;
  at: string;
  track: TrackListItem | null;
}

/** Actividad: lanzamientos de artistas que sigues y reposts de gente que sigues (`my_feed`). */
export async function getFeed(limit = 40): Promise<FeedItem[]> {
  const rows = unwrap(await supabase.rpc('my_feed', { p_limit: limit })) as Omit<
    FeedItem,
    'track'
  >[];
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.track_id))];
  const tracks = unwrap(
    await supabase.from('tracks').select(TRACK_FIELDS).in('id', ids),
  ) as unknown as TrackListItem[];
  const byId = new Map(tracks.map((t) => [t.id, t]));
  return rows.map((r) => ({ ...r, track: byId.get(r.track_id) ?? null })).filter((r) => r.track);
}

export async function getRepostedIds(): Promise<Set<string>> {
  const me = await currentUserId();
  const rows = unwrap(await supabase.from('reposts').select('track_id').eq('user_id', me)) as {
    track_id: string;
  }[];
  return new Set(rows.map((r) => r.track_id));
}

export async function setReposted(trackId: string, on: boolean) {
  const me = await currentUserId();
  if (on) {
    const { error } = await supabase.from('reposts').insert({ user_id: me, track_id: trackId });
    if (error && error.code !== '23505') throw error;
  } else {
    unwrap(await supabase.from('reposts').delete().eq('user_id', me).eq('track_id', trackId));
  }
}

/** Reposts públicos de un perfil, lo más nuevo primero. */
export async function getRepostsOf(userId: string): Promise<TrackListItem[]> {
  const rows = unwrap(
    await supabase
      .from('reposts')
      .select(`created_at,track:tracks(${TRACK_FIELDS})`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
  ) as unknown as { track: TrackListItem | null }[];
  return rows
    .map((r) => r.track)
    .filter((t): t is TrackListItem => !!t && t.status === 'published');
}

export async function getMyTopGenres(): Promise<
  { genre_id: number; name: string; minutes: number }[]
> {
  return unwrap(await supabase.rpc('my_top_genres', { p_limit: 3 })) as {
    genre_id: number;
    name: string;
    minutes: number;
  }[];
}
