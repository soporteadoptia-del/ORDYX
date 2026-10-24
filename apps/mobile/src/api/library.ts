import { LIMITS } from '@ordyx/shared';
import { supabase } from '@/lib/supabase';
import { getTracksByIds } from './catalog';
import { range, unwrap } from './client';
import {
  ALBUM_FIELDS,
  PLAYLIST_FIELDS,
  TRACK_FIELDS,
  type AlbumSummary,
  type PlaylistSummary,
  type TrackListItem,
} from './types';

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('ordyx:not_allowed');
  return id;
}

export async function getLikedTracks(page = 0): Promise<TrackListItem[]> {
  const me = await uid();
  const [from, to] = range(page, LIMITS.pageSize * 2);
  const rows = unwrap(
    await supabase
      .from('likes')
      .select(`created_at,track:tracks(${TRACK_FIELDS})`)
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .range(from, to),
  ) as unknown as { track: TrackListItem | null }[];
  return rows.map((r) => r.track).filter((t): t is TrackListItem => t !== null);
}

export async function getLikedIds(): Promise<Set<string>> {
  const me = await uid();
  const rows = unwrap(
    await supabase.from('likes').select('track_id').eq('user_id', me).limit(5000),
  ) as { track_id: string }[];
  return new Set(rows.map((r) => r.track_id));
}

export async function setLiked(trackId: string, liked: boolean) {
  const me = await uid();
  if (liked) unwrap(await supabase.from('likes').insert({ user_id: me, track_id: trackId }));
  else unwrap(await supabase.from('likes').delete().eq('user_id', me).eq('track_id', trackId));
}

export async function getRecentlyPlayed(limit = 20): Promise<TrackListItem[]> {
  const rows = unwrap(await supabase.rpc('recently_played', { p_limit: limit })) as {
    track_id: string;
  }[];
  return getTracksByIds(rows.map((r) => r.track_id));
}

export async function getListeningHistory(page = 0) {
  const me = await uid();
  const [from, to] = range(page, LIMITS.pageSize * 2);
  return unwrap(
    await supabase
      .from('listening_history')
      .select(`id,played_at,track:tracks(${TRACK_FIELDS})`)
      .eq('user_id', me)
      .order('played_at', { ascending: false })
      .range(from, to),
  ) as unknown as { id: number; played_at: string; track: TrackListItem | null }[];
}

export async function clearListeningHistory() {
  const me = await uid();
  unwrap(await supabase.from('listening_history').delete().eq('user_id', me));
}

export async function getMyPlaylists(): Promise<PlaylistSummary[]> {
  const me = await uid();
  return unwrap(
    await supabase
      .from('playlists')
      .select(PLAYLIST_FIELDS)
      .eq('owner_id', me)
      .order('updated_at', { ascending: false }),
  ) as unknown as PlaylistSummary[];
}

export async function getSavedPlaylists(): Promise<PlaylistSummary[]> {
  const me = await uid();
  const rows = unwrap(
    await supabase
      .from('saved_playlists')
      .select(`created_at,playlist:playlists(${PLAYLIST_FIELDS})`)
      .eq('user_id', me)
      .order('created_at', { ascending: false }),
  ) as unknown as { playlist: PlaylistSummary | null }[];
  return rows.map((r) => r.playlist).filter((p): p is PlaylistSummary => p !== null);
}

export async function getFollowedArtists() {
  const me = await uid();
  const rows = unwrap(
    await supabase
      .from('artist_follows')
      .select('created_at,artist:artists(id,name,slug,image_path,follower_count)')
      .eq('user_id', me)
      .order('created_at', { ascending: false }),
  ) as unknown as {
    artist: {
      id: string;
      name: string;
      slug: string;
      image_path: string | null;
      follower_count: number;
    } | null;
  }[];
  return rows.map((r) => r.artist).filter((a) => a !== null);
}

export async function getSavedAlbums(): Promise<AlbumSummary[]> {
  const me = await uid();
  const rows = unwrap(
    await supabase
      .from('saved_albums')
      .select(`created_at,album:albums(${ALBUM_FIELDS})`)
      .eq('user_id', me)
      .order('created_at', { ascending: false }),
  ) as unknown as { album: AlbumSummary | null }[];
  return rows.map((r) => r.album).filter((a): a is AlbumSummary => a !== null);
}

export async function isAlbumSaved(albumId: string): Promise<boolean> {
  const me = await uid();
  const rows = unwrap(
    await supabase
      .from('saved_albums')
      .select('album_id')
      .eq('user_id', me)
      .eq('album_id', albumId),
  ) as unknown[];
  return rows.length > 0;
}

export async function setAlbumSaved(albumId: string, saved: boolean) {
  const me = await uid();
  if (saved) unwrap(await supabase.from('saved_albums').insert({ user_id: me, album_id: albumId }));
  else
    unwrap(await supabase.from('saved_albums').delete().eq('user_id', me).eq('album_id', albumId));
}

export async function isFollowingArtist(artistId: string): Promise<boolean> {
  const me = await uid();
  const rows = unwrap(
    await supabase
      .from('artist_follows')
      .select('artist_id')
      .eq('user_id', me)
      .eq('artist_id', artistId),
  ) as unknown[];
  return rows.length > 0;
}

export async function setFollowingArtist(artistId: string, follow: boolean) {
  const me = await uid();
  if (follow)
    unwrap(await supabase.from('artist_follows').insert({ user_id: me, artist_id: artistId }));
  else
    unwrap(
      await supabase.from('artist_follows').delete().eq('user_id', me).eq('artist_id', artistId),
    );
}

export { uid as currentUserId };
