/**
 * Listas importadas: el usuario pega enlaces de YouTube, SoundCloud o Spotify (o líneas
 * «Artista - Canción») y Aurevix busca cada canción en su catálogo y en Audius. Los vídeos de
 * YouTube se reproducen con el reproductor oficial incrustado de YouTube. No se descarga ni se
 * copia audio de ningún servicio. Las listas se guardan en el dispositivo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { audiusToPlayable, searchAudius } from '@/api/audius';
import { getTracksByIds, searchCatalog } from '@/api/catalog';
import { env } from '@/lib/env';
import { toPlayable, type PlayableTrack } from '@/player/store';

export interface ResolvedLink {
  input: string;
  source: 'youtube' | 'soundcloud' | 'spotify' | 'text';
  query: string;
  title: string | null;
  artist: string | null;
  youtubeId: string | null;
  thumbnail: string | null;
  error?: 'spotify_list' | 'unsupported' | 'not_found';
}

export interface ImportedItem {
  input: string;
  source: ResolvedLink['source'];
  title: string;
  artist: string | null;
  thumbnail: string | null;
  youtubeId: string | null;
  match: PlayableTrack | null;
}

export interface ImportedList {
  id: string;
  name: string;
  createdAt: string;
  items: ImportedItem[];
}

const KEY = 'aurevix.imports.v1';

export async function getImportedLists(): Promise<ImportedList[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImportedList[]) : [];
  } catch {
    return [];
  }
}

async function saveLists(lists: ImportedList[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(lists));
}

export async function deleteImportedList(id: string) {
  await saveLists((await getImportedLists()).filter((l) => l.id !== id));
}

export async function resolveLinks(items: string[]): Promise<ResolvedLink[]> {
  const res = await fetch(`${env.supabaseUrl}/functions/v1/link-resolve`, {
    method: 'POST',
    headers: { apikey: env.supabaseKey, 'content-type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('ordyx:network');
  return ((await res.json()) as { data: ResolvedLink[] }).data;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** ¿El título encontrado se parece de verdad al buscado? Evita emparejar canciones al azar. */
function similar(wanted: string, found: string) {
  const a = new Set(
    norm(wanted)
      .split(' ')
      .filter((w) => w.length > 2),
  );
  const b = new Set(norm(found).split(' '));
  if (!a.size) return false;
  let hit = 0;
  a.forEach((w) => b.has(w) && hit++);
  return hit / a.size >= 0.6;
}

async function findMatch(r: ResolvedLink): Promise<PlayableTrack | null> {
  const wanted = r.title ?? r.query;
  const q = [r.artist, r.title].filter(Boolean).join(' ') || r.query;
  try {
    const own = (await searchCatalog(q, 'track', 0)).slice(0, 3);
    if (own.length) {
      const full = await getTracksByIds(own.map((o) => o.id));
      const hit = full.find((t) => similar(wanted, t.title));
      const p = hit ? toPlayable(hit) : null;
      if (p) return p;
    }
  } catch {
    // seguimos con Audius
  }
  try {
    const found = await searchAudius(q, 5);
    const hit = found.find((t) => similar(wanted, `${t.title} ${t.artist}`));
    return hit ? audiusToPlayable(hit) : null;
  } catch {
    return null;
  }
}

/** Resuelve, empareja y guarda una lista. `onProgress` informa de cuántas lleva. */
export async function importList(
  name: string,
  lines: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportedList> {
  const resolved = await resolveLinks(lines.slice(0, 100));
  const items: ImportedItem[] = [];
  let done = 0;
  for (let i = 0; i < resolved.length; i += 4) {
    const batch = await Promise.all(
      resolved.slice(i, i + 4).map(async (r) => {
        const match = r.error === 'spotify_list' ? null : await findMatch(r);
        done++;
        onProgress?.(done, resolved.length);
        return {
          input: r.input,
          source: r.source,
          title: r.title ?? r.query,
          artist: r.artist,
          thumbnail: r.thumbnail,
          youtubeId: r.youtubeId,
          match,
        } satisfies ImportedItem;
      }),
    );
    items.push(...batch);
  }
  const list: ImportedList = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Lista importada',
    createdAt: new Date().toISOString(),
    items,
  };
  await saveLists([list, ...(await getImportedLists())]);
  return list;
}
