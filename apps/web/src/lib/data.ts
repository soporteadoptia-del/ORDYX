import { BRAND, publicImageUrl, type AppVersion, type Platform } from '@ordyx/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { env, isConfigured } from './env';
import { anonClient } from './supabase';

export type PublicVersion = Pick<
  AppVersion,
  | 'id'
  | 'platform'
  | 'channel'
  | 'version'
  | 'build_number'
  | 'install_method'
  | 'release_notes'
  | 'min_os_version'
  | 'download_url'
  | 'storage_path'
  | 'file_size_bytes'
  | 'sha256'
  | 'published_at'
>;

const VERSION_FIELDS =
  'id,platform,channel,version,build_number,install_method,release_notes,min_os_version,download_url,storage_path,file_size_bytes,sha256,published_at';

/** URL final de descarga/instalación de una versión. Nunca se inventa: solo URLs registradas o archivos del bucket `releases`. */
export function installUrl(v: PublicVersion): string | null {
  if (v.download_url) return v.download_url;
  if (v.storage_path) return publicImageUrl(env.supabaseUrl, 'releases', v.storage_path);
  return null;
}

export interface VersionsResult {
  ok: boolean;
  current: Partial<Record<`${Platform}:${'stable' | 'beta'}`, PublicVersion>>;
  history: PublicVersion[];
}

/**
 * Versiones publicadas (RLS solo expone `status = 'published'` al público: las retiradas y los borradores
 * nunca llegan a la web). Si el backend no responde, `ok = false` y la web lo indica en vez de mostrar enlaces.
 */
export async function getVersions(): Promise<VersionsResult> {
  'use cache';
  cacheLife('minutes');
  cacheTag('app-versions');
  if (!isConfigured) return { ok: false, current: {}, history: [] };
  try {
    const { data, error } = await anonClient()
      .from('app_versions')
      .select(VERSION_FIELDS)
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const history = (data ?? []) as PublicVersion[];
    const current: VersionsResult['current'] = {};
    for (const v of history) {
      const key = `${v.platform}:${v.channel}` as const;
      if (!current[key]) current[key] = v;
    }
    return { ok: true, current, history };
  } catch (e) {
    console.error('[web] getVersions', e instanceof Error ? e.message : e);
    return { ok: false, current: {}, history: [] };
  }
}

export interface PublicConfig {
  platformName: string;
  supportEmail: string;
  socialLinks: Record<string, string>;
  maintenanceMessage: string | null;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  'use cache';
  cacheLife('minutes');
  cacheTag('app-config');
  const fallback: PublicConfig = {
    platformName: BRAND.name,
    supportEmail: BRAND.supportEmail,
    socialLinks: {},
    maintenanceMessage: null,
  };
  if (!isConfigured) return fallback;
  try {
    const { data, error } = await anonClient().from('app_config').select('key,value');
    if (error) throw error;
    const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<
      string,
      unknown
    >;
    const links = (map.social_links ?? {}) as Record<string, string>;
    return {
      platformName:
        typeof map.platform_name === 'string' ? map.platform_name : fallback.platformName,
      supportEmail:
        typeof map.support_email === 'string' ? map.support_email : fallback.supportEmail,
      socialLinks: Object.fromEntries(
        Object.entries(links).filter(([, u]) => typeof u === 'string' && u.startsWith('https://')),
      ),
      maintenanceMessage:
        typeof map.maintenance_message === 'string' ? map.maintenance_message : null,
    };
  } catch {
    return fallback;
  }
}

export interface SharedTrack {
  id: string;
  title: string;
  description: string | null;
  durationMs: number | null;
  coverUrl: string | null;
  artistName: string;
  isDemo: boolean;
}

export async function getSharedTrack(id: string): Promise<SharedTrack | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(`track-${id}`);
  if (!isConfigured || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await anonClient()
    .from('tracks')
    .select('id,title,description,duration_ms,cover_path,is_demo,artist:artists(name,image_path)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const artist = data.artist as unknown as { name: string; image_path: string | null } | null;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    durationMs: data.duration_ms,
    coverUrl: publicImageUrl(env.supabaseUrl, 'covers', data.cover_path ?? artist?.image_path),
    artistName: artist?.name ?? '',
    isDemo: data.is_demo,
  };
}

export interface SharedPlaylist {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  owner: string;
  trackCount: number;
  durationMs: number;
}

export async function getSharedPlaylist(id: string): Promise<SharedPlaylist | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(`playlist-${id}`);
  if (!isConfigured || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  // RLS: el rol anónimo solo puede leer playlists públicas.
  const { data } = await anonClient()
    .from('playlists')
    .select('id,title,description,cover_path,track_count,duration_ms,owner:profiles(username)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    coverUrl: publicImageUrl(env.supabaseUrl, 'playlist-images', data.cover_path),
    owner: (data.owner as unknown as { username: string } | null)?.username ?? '',
    trackCount: data.track_count,
    durationMs: data.duration_ms,
  };
}
