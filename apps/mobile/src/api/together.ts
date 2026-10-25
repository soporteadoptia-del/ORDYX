/** Música en compañía: mensajes, listas colaborativas y Fusión (ver `aurevix_together`). */
import { supabase } from '@/lib/supabase';
import { getTracksByIds } from './catalog';
import { unwrap } from './client';
import { currentUserId } from './library';
import { getFollowList } from './social';
import {
  PLAYLIST_FIELDS,
  type PlaylistSummary,
  type ProfileSummary,
  type TrackListItem,
} from './types';

export interface Conversation {
  other_id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  last_body: string | null;
  last_kind: 'text' | 'track' | 'playlist';
  last_at: string;
  last_from_me: boolean;
  unread: number;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  track_id: string | null;
  playlist_id: string | null;
  created_at: string;
  read_at: string | null;
}

export async function getConversations(): Promise<Conversation[]> {
  return unwrap(await supabase.rpc('my_conversations')) as Conversation[];
}

export async function getThread(otherId: string): Promise<Message[]> {
  const me = await currentUserId();
  return unwrap(
    await supabase
      .from('messages')
      .select('id,sender_id,recipient_id,body,track_id,playlist_id,created_at,read_at')
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${me})`,
      )
      .order('created_at', { ascending: true })
      .limit(200),
  ) as Message[];
}

export async function sendMessage(
  recipientId: string,
  input: { body?: string; trackId?: string; playlistId?: string },
) {
  unwrap(
    await supabase.from('messages').insert({
      recipient_id: recipientId,
      body: input.body?.trim() || null,
      track_id: input.trackId ?? null,
      playlist_id: input.playlistId ?? null,
    }),
  );
}

export async function markThreadRead(otherId: string) {
  const me = await currentUserId();
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', me)
    .eq('sender_id', otherId)
    .is('read_at', null);
}

export async function getUnreadMessages(): Promise<number> {
  const me = await currentUserId();
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', me)
    .is('read_at', null);
  return count ?? 0;
}

/** Personas a las que sigo (para escribirles o hacer una Fusión). */
export async function getPeopleIFollow(): Promise<ProfileSummary[]> {
  return getFollowList(await currentUserId(), 'following');
}

/** Quienes me siguen y a quienes sigo: con ellos se puede hacer una Fusión. */
export async function getMutuals(): Promise<ProfileSummary[]> {
  const me = await currentUserId();
  const [following, followers] = await Promise.all([
    getFollowList(me, 'following'),
    getFollowList(me, 'followers'),
  ]);
  const back = new Set(followers.map((p) => p.id));
  return following.filter((p) => back.has(p.id));
}

export async function getBlend(
  userId: string,
): Promise<{ track: TrackListItem; fromMe: boolean }[]> {
  const me = await currentUserId();
  const rows = unwrap(await supabase.rpc('blend_with', { p_user: userId, p_limit: 60 })) as {
    track_id: string;
    from_user: string;
    score: number;
  }[];
  if (!rows.length) return [];
  const tracks = await getTracksByIds(rows.map((r) => r.track_id));
  const byId = new Map(tracks.map((t) => [t.id, t]));
  return rows
    .sort((a, b) => b.score - a.score)
    .map((r) => ({ track: byId.get(r.track_id)!, fromMe: r.from_user === me }))
    .filter((r) => r.track);
}

export async function setCollaborative(playlistId: string, on: boolean) {
  unwrap(await supabase.from('playlists').update({ is_collaborative: on }).eq('id', playlistId));
}

export async function joinPlaylist(playlistId: string) {
  unwrap(await supabase.rpc('join_playlist', { p_playlist: playlistId }));
}

export async function getCollabPlaylists(): Promise<PlaylistSummary[]> {
  const rows = unwrap(await supabase.rpc('my_collab_playlists')) as { id: string }[];
  if (!rows.length) return [];
  return unwrap(
    await supabase
      .from('playlists')
      .select(PLAYLIST_FIELDS)
      .in(
        'id',
        rows.map((r) => r.id),
      ),
  ) as unknown as PlaylistSummary[];
}
