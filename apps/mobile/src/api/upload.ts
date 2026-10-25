import {
  fileExtension,
  slugify,
  storagePaths,
  STORAGE_BUCKETS,
  type TrackMetadataInput,
  type TrackStatus,
} from '@ordyx/shared';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { unwrap } from './client';
import { currentUserId } from './library';
import { TRACK_DETAIL_FIELDS, type TrackDetail } from './types';

export type MyArtist = {
  id: string;
  name: string;
  slug: string;
  image_path: string | null;
  member_role: string;
};

export async function getMyArtists(): Promise<MyArtist[]> {
  const me = await currentUserId();
  const rows = unwrap(
    await supabase
      .from('artist_members')
      .select('member_role,artist:artists(id,name,slug,image_path)')
      .eq('user_id', me),
  ) as unknown as { member_role: string; artist: Omit<MyArtist, 'member_role'> | null }[];
  return rows.filter((r) => r.artist).map((r) => ({ ...r.artist!, member_role: r.member_role }));
}

export async function createArtist(name: string, bio: string | null): Promise<string> {
  const me = await currentUserId();
  const base = slugify(name) || 'artista';
  // El slug debe ser único: se añade un sufijo corto aleatorio si ya existe.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0 ? base : `${base.slice(0, 52)}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await supabase
      .from('artists')
      .insert({ name, bio, slug, created_by: me })
      .select('id')
      .single();
    if (!error) return (data as { id: string }).id;
    if (error.code !== '23505') throw error;
  }
  throw new Error('ordyx:invalid_input');
}

export async function getMyTracks(): Promise<TrackDetail[]> {
  const me = await currentUserId();
  return unwrap(
    await supabase
      .from('tracks')
      .select(TRACK_DETAIL_FIELDS)
      .eq('owner_id', me)
      .order('created_at', { ascending: false }),
  ) as unknown as TrackDetail[];
}

export async function createDraftTrack(
  artistId: string,
  meta: TrackMetadataInput,
  durationMs: number | null,
): Promise<string> {
  const me = await currentUserId();
  const row = unwrap(
    await supabase
      .from('tracks')
      .insert({ artist_id: artistId, owner_id: me, ...meta, duration_ms: durationMs })
      .select('id')
      .single(),
  ) as { id: string };
  return row.id;
}

export async function updateTrack(
  id: string,
  patch: Partial<TrackMetadataInput> & {
    cover_path?: string | null;
    audio_path?: string | null;
    audio_mime?: string | null;
    audio_size_bytes?: number | null;
    duration_ms?: number | null;
  },
) {
  unwrap(await supabase.from('tracks').update(patch).eq('id', id));
}

export async function submitTrack(id: string): Promise<TrackStatus> {
  return unwrap(
    await supabase.rpc('submit_track', { p_track_id: id, p_rights_confirmed: true }),
  ) as TrackStatus;
}

export async function unpublishTrack(id: string) {
  unwrap(await supabase.rpc('unpublish_own_track', { p_track_id: id }));
}

/**
 * Borra la canción y sus archivos (audio de streaming, original conservado por el worker y portada;
 * todos están en carpetas del propio usuario).
 */
export async function deleteTrack(track: {
  id: string;
  audio_path: string | null;
  cover_path: string | null;
}) {
  const { data } = await supabase
    .from('tracks')
    .select('original_audio_path')
    .eq('id', track.id)
    .maybeSingle();
  unwrap(await supabase.from('tracks').delete().eq('id', track.id));
  const audioFiles = [
    track.audio_path,
    (data as { original_audio_path: string | null } | null)?.original_audio_path,
  ].filter((p): p is string => Boolean(p));
  if (audioFiles.length) await supabase.storage.from(STORAGE_BUCKETS.audio).remove(audioFiles);
  if (track.cover_path)
    await supabase.storage.from(STORAGE_BUCKETS.covers).remove([track.cover_path]);
}

export interface LocalFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

/**
 * Sube un archivo a Storage mostrando el progreso real (bytes enviados). Se usa la API REST de
 * Storage con el token del usuario: las políticas RLS de Storage deciden si la subida está permitida.
 * No se carga el archivo completo en memoria de JavaScript.
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: LocalFile,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('ordyx:not_allowed');
  const url = `${env.supabaseUrl}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: env.supabaseKey,
    'Content-Type': file.mimeType,
    'x-upsert': 'true',
    'cache-control': '3600',
  };

  if (Platform.OS === 'web') {
    // Vista previa web (desarrollo): subida con fetch, sin progreso intermedio.
    const blob = await (await fetch(file.uri)).blob();
    const res = await fetch(url, { method: 'POST', headers, body: blob, signal });
    if (!res.ok) throw new Error(await res.text());
    onProgress(1);
    return;
  }

  const task = new File(file.uri).createUploadTask(url, {
    httpMethod: 'POST',
    headers,
    mimeType: file.mimeType,
    sessionType: 'foreground',
    onProgress: ({ bytesSent, totalBytes }) =>
      onProgress(totalBytes > 0 ? bytesSent / totalBytes : 0),
    signal,
  } as Parameters<File['createUploadTask']>[1]);
  const result = await task.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    let message = `HTTP ${result.status}`;
    try {
      message = (JSON.parse(result.body) as { message?: string }).message ?? message;
    } catch {
      // cuerpo no JSON
    }
    throw new Error(message);
  }
  onProgress(1);
}

export async function uploadAudio(
  trackId: string,
  file: LocalFile,
  onProgress: (f: number) => void,
  signal?: AbortSignal,
) {
  const me = await currentUserId();
  const path = storagePaths.audioOriginal(me, trackId, fileExtension(file.name) || 'mp3');
  await uploadWithProgress(STORAGE_BUCKETS.audio, path, file, onProgress, signal);
  return path;
}

export async function uploadImage(
  kind: 'avatar' | 'trackCover' | 'playlist',
  file: LocalFile,
  ownerId: string,
  entityId?: string,
): Promise<{ bucket: string; path: string }> {
  const ext = fileExtension(file.name) || (file.mimeType === 'image/png' ? 'png' : 'jpg');
  const target =
    kind === 'avatar'
      ? { bucket: STORAGE_BUCKETS.avatars, path: storagePaths.avatar(ownerId, ext) }
      : kind === 'trackCover'
        ? { bucket: STORAGE_BUCKETS.covers, path: storagePaths.trackCover(ownerId, entityId!, ext) }
        : {
            bucket: STORAGE_BUCKETS.playlistImages,
            path: storagePaths.playlistImage(ownerId, entityId!, ext),
          };
  await uploadWithProgress(target.bucket, target.path, file, () => undefined);
  return target;
}
