import type { TrackListItem } from '@/api/types';
import { toPlayable, usePlayer, type PlayContext, type PlayableTrack } from './store';

/** Reproduce una lista de canciones empezando por `index`, ignorando las que no tienen audio. */
export function playList(tracks: TrackListItem[], index: number, context: PlayContext) {
  const target = tracks[index];
  const playable = tracks.map(toPlayable).filter((t): t is PlayableTrack => t !== null);
  const start = Math.max(0, playable.findIndex((t) => t.id === target?.id));
  return usePlayer.getState().playTracks(playable, start, context);
}

export function shufflePlay(tracks: TrackListItem[], context: PlayContext) {
  const { queue, toggleShuffle } = usePlayer.getState();
  if (!queue.shuffle) toggleShuffle();
  return playList(tracks, Math.floor(Math.random() * tracks.length), context);
}
