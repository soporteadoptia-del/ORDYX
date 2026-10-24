import { LIMITS, type Comment, type ReportInput } from '@ordyx/shared';
import { supabase } from '@/lib/supabase';
import { range, unwrap } from './client';
import { currentUserId } from './library';
import { PLAYLIST_FIELDS, PROFILE_FIELDS, TRACK_FIELDS, type PlaylistSummary, type ProfileSummary, type TrackListItem } from './types';

export async function getProfileByUsername(username: string): Promise<ProfileSummary> {
  return unwrap(
    await supabase.from('profiles').select(PROFILE_FIELDS).eq('username', username.toLowerCase()).single(),
  ) as ProfileSummary;
}

export async function getProfileById(id: string): Promise<ProfileSummary> {
  return unwrap(await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', id).single()) as ProfileSummary;
}

export async function getPublicPlaylistsOf(userId: string): Promise<PlaylistSummary[]> {
  return unwrap(
    await supabase
      .from('playlists')
      .select(PLAYLIST_FIELDS)
      .eq('owner_id', userId)
      .eq('is_public', true)
      .order('updated_at', { ascending: false }),
  ) as unknown as PlaylistSummary[];
}

/** Canciones publicadas por un usuario (si tiene permisos de artista). */
export async function getPublishedTracksOf(userId: string): Promise<TrackListItem[]> {
  return unwrap(
    await supabase
      .from('tracks')
      .select(TRACK_FIELDS)
      .eq('owner_id', userId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50),
  ) as unknown as TrackListItem[];
}

/** Favoritos de otro usuario: RLS solo los devuelve si ha activado "favoritos públicos". */
export async function getPublicLikesOf(userId: string): Promise<TrackListItem[]> {
  const rows = unwrap(
    await supabase
      .from('likes')
      .select(`created_at,track:tracks(${TRACK_FIELDS})`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ) as unknown as { track: TrackListItem | null }[];
  return rows.map((r) => r.track).filter((t): t is TrackListItem => t !== null);
}

export async function isFollowing(userId: string): Promise<boolean> {
  const me = await currentUserId();
  const rows = unwrap(
    await supabase.from('follows').select('followee_id').eq('follower_id', me).eq('followee_id', userId),
  ) as unknown[];
  return rows.length > 0;
}

export async function setFollowing(userId: string, follow: boolean) {
  const me = await currentUserId();
  if (follow) unwrap(await supabase.from('follows').insert({ follower_id: me, followee_id: userId }));
  else unwrap(await supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', userId));
}

export async function getFollowList(userId: string, kind: 'followers' | 'following', page = 0): Promise<ProfileSummary[]> {
  const [from, to] = range(page, LIMITS.pageSize * 2);
  const column = kind === 'followers' ? 'followee_id' : 'follower_id';
  const join = kind === 'followers' ? 'profile:profiles!follows_follower_id_fkey' : 'profile:profiles!follows_followee_id_fkey';
  const rows = unwrap(
    await supabase
      .from('follows')
      .select(`created_at,${join}(${PROFILE_FIELDS})`)
      .eq(column, userId)
      .order('created_at', { ascending: false })
      .range(from, to),
  ) as unknown as { profile: ProfileSummary | null }[];
  return rows.map((r) => r.profile).filter((p): p is ProfileSummary => p !== null);
}

export type CommentWithAuthor = Comment & {
  author: Pick<ProfileSummary, 'id' | 'username' | 'display_name' | 'avatar_path'> | null;
};

export async function getComments(trackId: string, page = 0): Promise<CommentWithAuthor[]> {
  const [from, to] = range(page, LIMITS.pageSize);
  return unwrap(
    await supabase
      .from('comments')
      .select('*,author:profiles(id,username,display_name,avatar_path)')
      .eq('track_id', trackId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(from, to),
  ) as unknown as CommentWithAuthor[];
}

export async function addComment(trackId: string, body: string, timestampMs: number | null) {
  const me = await currentUserId();
  unwrap(await supabase.from('comments').insert({ track_id: trackId, user_id: me, body, timestamp_ms: timestampMs }));
}

export async function deleteComment(id: string) {
  unwrap(await supabase.from('comments').delete().eq('id', id));
}

export async function submitReport(input: ReportInput) {
  const me = await currentUserId();
  unwrap(await supabase.from('reports').insert({ ...input, reporter_id: me }));
}

export async function isBlocked(userId: string): Promise<boolean> {
  const me = await currentUserId();
  const rows = unwrap(
    await supabase.from('blocks').select('blocked_id').eq('blocker_id', me).eq('blocked_id', userId),
  ) as unknown[];
  return rows.length > 0;
}

export async function setBlocked(userId: string, blocked: boolean) {
  const me = await currentUserId();
  if (blocked) unwrap(await supabase.from('blocks').insert({ blocker_id: me, blocked_id: userId }));
  else unwrap(await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', userId));
}

export async function getSearchHistory(): Promise<{ id: number; query: string }[]> {
  const me = await currentUserId();
  return unwrap(
    await supabase.from('search_history').select('id,query').eq('user_id', me).order('created_at', { ascending: false }).limit(15),
  ) as { id: number; query: string }[];
}

export async function addSearchHistory(query: string) {
  const me = await currentUserId();
  await supabase.from('search_history').insert({ user_id: me, query: query.trim().slice(0, 100) });
}

export async function clearSearchHistory() {
  const me = await currentUserId();
  unwrap(await supabase.from('search_history').delete().eq('user_id', me));
}
