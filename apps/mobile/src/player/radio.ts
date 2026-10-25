import { AUDIUS_GENRES, audiusToPlayable, getTrendingNow, isExternal } from '@/api/audius';
import { getPopularTracks, getTrack, getTracksByGenre } from '@/api/catalog';
import { toPlayable, usePlayer, type PlayableTrack } from './store';

const RADIO_SIZE = 25;

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Canciones parecidas a `seed`: del mismo género, en nuestro catálogo o en Audius según de dónde
 * venga, completadas con lo más escuchado. Nunca repite la propia canción ni las que ya están en
 * la cola.
 */
export async function radioFor(seed: PlayableTrack): Promise<PlayableTrack[]> {
  const queued = new Set(usePlayer.getState().queue.entries.map((e) => e.item.id));
  queued.add(seed.id);
  let pool: PlayableTrack[] = [];

  if (isExternal(seed.id)) {
    const genre = AUDIUS_GENRES.find((g) => g.key && g.key === seed.genre)?.key ?? null;
    pool = (await getTrendingNow(genre, 40)).map(audiusToPlayable);
  } else {
    const detail = await getTrack(seed.id).catch(() => null);
    const sameGenre = detail?.genre_id
      ? await getTracksByGenre(detail.genre_id).catch(() => [])
      : [];
    pool = sameGenre.map(toPlayable).filter((t): t is PlayableTrack => !!t);
    if (pool.length < RADIO_SIZE) {
      const popular = await getPopularTracks(40).catch(() => []);
      pool = pool.concat(popular.map(toPlayable).filter((t): t is PlayableTrack => !!t));
    }
    if (pool.filter((t) => !queued.has(t.id)).length < 5) {
      pool = pool.concat((await getTrendingNow(null, 20).catch(() => [])).map(audiusToPlayable));
    }
  }
  const seen = new Set<string>();
  return shuffle(pool)
    .filter((t) => !queued.has(t.id) && !seen.has(t.id) && seen.add(t.id))
    .slice(0, RADIO_SIZE);
}

/** Radio de una canción (gratis): suena la canción y después música parecida. */
export async function startRadio(seed: PlayableTrack) {
  // Se arranca primero la canción, dentro del toque, para que Safari en iPhone deje sonar el audio.
  const player = usePlayer.getState();
  const playingSeed = player.playTracks([seed], 0, { type: 'track', id: seed.id });
  const more = await radioFor(seed).catch(() => []);
  await playingSeed;
  for (const t of more) usePlayer.getState().addToQueue(t);
}
