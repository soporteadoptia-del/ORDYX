import type { PlaylistInput } from '@ordyx/shared';
import { supabase } from '@/lib/supabase';
import { unwrap } from './client';
import { currentUserId } from './library';
import { PLAYLIST_FIELDS, TRACK_FIELDS, type PlaylistItem, type PlaylistSummary } from './types';

export async function getPlaylist(
  id: string,
): Promise<PlaylistSummary & { items: PlaylistItem[] }> {
  const playlist = unwrap(
    await supabase.from('playlists').select(PLAYLIST_FIELDS).eq('id', id).single(),
  ) as unknown as PlaylistSummary;
  const items = unwrap(
    await supabase
      .from('playlist_tracks')
      .select(`id,position,added_at,track:tracks(${TRACK_FIELDS})`)
      .eq('playlist_id', id)
      .order('position'),
  ) as unknown as (Omit<PlaylistItem, 'track'> & { track: PlaylistItem['track'] | null })[];
  // Las canciones retiradas dejan de ser visibles por RLS: se omiten en la lista.
  return { ...playlist, items: items.filter((i): i is PlaylistItem => i.track !== null) };
}

export async function createPlaylist(input: PlaylistInput): Promise<string> {
  const owner = await currentUserId();
  const row = unwrap(
    await supabase
      .from('playlists')
      .insert({ ...input, owner_id: owner })
      .select('id')
      .single(),
  ) as { id: string };
  return row.id;
}

export async function updatePlaylist(
  id: string,
  patch: Partial<PlaylistInput> & { cover_path?: string | null },
) {
  unwrap(await supabase.from('playlists').update(patch).eq('id', id));
}

export async function deletePlaylist(id: string) {
  unwrap(await supabase.from('playlists').delete().eq('id', id));
}

export async function addTrackToPlaylist(playlistId: string, trackId: string) {
  const me = await currentUserId();
  unwrap(
    await supabase
      .from('playlist_tracks')
      .insert({ playlist_id: playlistId, track_id: trackId, added_by: me }),
  );
}

export async function removePlaylistItem(itemId: number) {
  unwrap(await supabase.from('playlist_tracks').delete().eq('id', itemId));
}

/** Mueve un elemento a una posición (1-based); el servidor renumera el resto. */
export async function movePlaylistItem(itemId: number, newPosition: number) {
  unwrap(
    await supabase.rpc('move_playlist_track', { p_item_id: itemId, p_new_position: newPosition }),
  );
}

export async function isPlaylistSaved(playlistId: string): Promise<boolean> {
  const me = await currentUserId();
  const rows = unwrap(
    await supabase
      .from('saved_playlists')
      .select('playlist_id')
      .eq('user_id', me)
      .eq('playlist_id', playlistId),
  ) as unknown[];
  return rows.length > 0;
}

export async function setPlaylistSaved(playlistId: string, saved: boolean) {
  const me = await currentUserId();
  if (saved)
    unwrap(await supabase.from('saved_playlists').insert({ user_id: me, playlist_id: playlistId }));
  else
    unwrap(
      await supabase
        .from('saved_playlists')
        .delete()
        .eq('user_id', me)
        .eq('playlist_id', playlistId),
    );
}
