import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { getTracksByIds } from '@/api/catalog';
import { reportError } from '@/lib/errors';
import { resolveRemoteUrl } from '@/lib/media';
import type { PlayableTrack } from './store';

/**
 * Descargas sin conexión (Aurevix Premium). El audio se guarda en la carpeta privada de la app, nunca
 * en la galería ni en una carpeta compartida, y solo se reproduce mientras el plan sigue activo.
 */
export interface Download {
  track: PlayableTrack;
  uri: string;
  bytes: number;
  savedAt: string;
}

interface DownloadsState {
  items: Record<string, Download>;
  /** Progreso 0–1 de las descargas en curso. */
  active: Record<string, number>;
  /**
   * Hasta cuándo dura el plan Premium (ms), según la última consulta al servidor. Se guarda para que
   * las descargas funcionen sin conexión; al caducar dejan de usarse.
   */
  plusUntil: number;
}

export const downloadsSupported = Platform.OS !== 'web';
const KEY = 'aurevix.downloads.v1';
const PLUS_KEY = 'aurevix.plus.until.v1';

export const useDownloads = create<DownloadsState>(() => ({
  items: {},
  active: {},
  plusUntil: 0,
}));

export const plusActiveNow = () => useDownloads.getState().plusUntil > Date.now();

/** Lo llama la raíz de la app cada vez que llega el estado del plan desde el servidor. */
export function setPlusUntil(expiresAt: string | null) {
  const plusUntil = expiresAt ? new Date(expiresAt).getTime() : 0;
  if (plusUntil === useDownloads.getState().plusUntil) return;
  useDownloads.setState({ plusUntil });
  AsyncStorage.setItem(PLUS_KEY, String(plusUntil)).catch(() => undefined);
}

function folder() {
  const dir = new Directory(Paths.document, 'downloads');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(useDownloads.getState().items)).catch(() => undefined);
}

export async function restoreDownloads() {
  try {
    const until = Number(await AsyncStorage.getItem(PLUS_KEY));
    if (until > 0 && useDownloads.getState().plusUntil === 0)
      useDownloads.setState({ plusUntil: until });
  } catch {
    // sin dato guardado
  }
  if (!downloadsSupported) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Record<string, Download>;
    // Se descartan las entradas cuyo archivo ya no existe (p. ej. si el sistema liberó espacio).
    const items = Object.fromEntries(
      Object.entries(saved).filter(([, d]) => new File(d.uri).exists),
    );
    useDownloads.setState({ items });
  } catch (e) {
    reportError(e, { where: 'restoreDownloads' });
  }
  void pruneWithdrawn();
}

/**
 * Borra las descargas de canciones que ya no están publicadas (retiradas por su artista o por
 * moderación). Solo actúa si el servidor responde: sin conexión no se toca nada.
 */
async function pruneWithdrawn() {
  const ids = Object.keys(useDownloads.getState().items);
  if (ids.length === 0) return;
  try {
    const visible = await getTracksByIds(ids);
    const published = new Set(visible.filter((t) => t.status === 'published').map((t) => t.id));
    for (const id of ids) if (!published.has(id)) removeDownload(id);
  } catch {
    // sin conexión: se vuelve a comprobar en el próximo arranque
  }
}

/** Ruta local para reproducir sin conexión, o null si no está descargada (o no hay Premium). */
export function localUriFor(trackId: string): string | null {
  if (!plusActiveNow()) return null;
  return useDownloads.getState().items[trackId]?.uri ?? null;
}

export async function downloadTrack(track: PlayableTrack) {
  if (!downloadsSupported) throw new Error('ordyx:not_supported');
  const { items, active } = useDownloads.getState();
  if (items[track.id] || active[track.id] !== undefined) return;
  useDownloads.setState({ active: { ...active, [track.id]: 0 } });
  try {
    const { url } = await resolveRemoteUrl(track.id, track.audioPath, 'max', true);
    const ext = track.audioPath.split('.').pop()?.toLowerCase() || 'audio';
    const target = new File(folder(), `${track.id}.${ext}`);
    const file = await File.downloadFileAsync(url, target, { idempotent: true });
    const entry: Download = {
      track,
      uri: file.uri,
      bytes: file.size ?? 0,
      savedAt: new Date().toISOString(),
    };
    useDownloads.setState((s) => ({ items: { ...s.items, [track.id]: entry } }));
    persist();
  } finally {
    useDownloads.setState((s) => {
      const next = { ...s.active };
      delete next[track.id];
      return { active: next };
    });
  }
}

export function removeDownload(trackId: string) {
  const entry = useDownloads.getState().items[trackId];
  if (!entry) return;
  try {
    const f = new File(entry.uri);
    if (f.exists) f.delete();
  } catch (e) {
    reportError(e, { where: 'removeDownload' });
  }
  useDownloads.setState((s) => {
    const items = { ...s.items };
    delete items[trackId];
    return { items };
  });
  persist();
}

export function removeAllDownloads() {
  for (const id of Object.keys(useDownloads.getState().items)) removeDownload(id);
}
