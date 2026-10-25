import { publicImageUrl, STORAGE_BUCKETS } from '@ordyx/shared';
import { env } from './env';
import { supabase } from './supabase';

type ImageBucket =
  | typeof STORAGE_BUCKETS.avatars
  | typeof STORAGE_BUCKETS.covers
  | typeof STORAGE_BUCKETS.playlistImages;

export function imageUrl(bucket: ImageBucket, path: string | null | undefined): string | null {
  return publicImageUrl(env.supabaseUrl, bucket, path);
}

/**
 * Resuelve la URL de reproducción de una canción. Es el ÚNICO punto que conoce dónde vive el audio:
 * para migrar a un CDN o a otro proveedor (tracks.storage_provider = 'external') solo cambia esta función.
 * El bucket `audio` es privado: Storage solo firma la URL si la política RLS lo permite.
 */
const cache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_TTL_S = 60 * 60;

export async function resolveStreamUrl(audioPath: string): Promise<string> {
  const hit = cache.get(audioPath);
  if (hit && hit.expiresAt - Date.now() > 5 * 60_000) return hit.url;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.audio)
    .createSignedUrl(audioPath, SIGNED_TTL_S);
  if (error || !data?.signedUrl) throw error ?? new Error('ordyx:not_found');
  cache.set(audioPath, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_TTL_S * 1000 });
  return data.signedUrl;
}

export function invalidateStreamUrl(audioPath: string) {
  cache.delete(audioPath);
}
