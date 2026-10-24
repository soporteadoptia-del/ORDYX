import { STORAGE_BUCKETS } from './constants';

/**
 * Convenciones de rutas en Supabase Storage. La primera carpeta SIEMPRE es el `auth.uid()`
 * del propietario: las políticas de Storage lo exigen para permitir escrituras.
 */
export const storagePaths = {
  avatar: (userId: string, ext: string) => `${userId}/avatar-${Date.now()}.${ext}`,
  trackCover: (userId: string, trackId: string, ext: string) => `${userId}/tracks/${trackId}-${Date.now()}.${ext}`,
  albumCover: (userId: string, albumId: string, ext: string) => `${userId}/albums/${albumId}-${Date.now()}.${ext}`,
  artistImage: (userId: string, artistId: string, ext: string) => `${userId}/artists/${artistId}-${Date.now()}.${ext}`,
  playlistImage: (userId: string, playlistId: string, ext: string) => `${userId}/${playlistId}-${Date.now()}.${ext}`,
  audioOriginal: (userId: string, trackId: string, ext: string) => `${userId}/${trackId}/original.${ext}`,
};

/** URL pública de una imagen en un bucket público. Devuelve null si no hay ruta. */
export function publicImageUrl(
  supabaseUrl: string,
  bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS],
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1]!.toLowerCase() : '';
}
