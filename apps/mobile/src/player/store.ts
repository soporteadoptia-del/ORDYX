import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createQueue,
  current,
  cycleRepeat,
  emptyQueue,
  enqueue,
  goTo,
  move,
  nextIndex,
  PLAY_RULES,
  playNext,
  previousIndex,
  removeAt,
  setShuffle,
  type QueueState,
  type RepeatMode,
} from '@ordyx/shared';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { create } from 'zustand';
import { reportPlayProgress, startPlay } from '@/api/plays';
import type { TrackListItem } from '@/api/types';
import { reportError, toUserMessage } from '@/lib/errors';
import { imageUrl, invalidateStreamUrl, resolveStreamUrl } from '@/lib/media';

export interface PlayableTrack {
  id: string;
  title: string;
  artistName: string;
  artistId: string | null;
  coverUrl: string | null;
  audioPath: string;
  durationMs: number | null;
  isDemo: boolean;
}

export function toPlayable(t: TrackListItem): PlayableTrack | null {
  if (!t.audio_path) return null;
  return {
    id: t.id,
    title: t.title,
    artistName: t.artist?.name ?? 'Artista desconocido',
    artistId: t.artist?.id ?? null,
    coverUrl: imageUrl('covers', t.cover_path) ?? imageUrl('covers', t.artist?.image_path),
    audioPath: t.audio_path,
    durationMs: t.duration_ms,
    isDemo: t.is_demo,
  };
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export interface PlayContext {
  type:
    'playlist' | 'album' | 'artist' | 'search' | 'home' | 'library' | 'track' | 'profile' | 'queue';
  id?: string | null;
}

interface PlayerState {
  queue: QueueState<PlayableTrack>;
  context: PlayContext | null;
  status: PlaybackStatus;
  error: string | null;
  positionMs: number;
  durationMs: number;
  isBuffering: boolean;
  playTracks: (tracks: PlayableTrack[], startIndex: number, context: PlayContext) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addNext: (track: PlayableTrack) => void;
  addToQueue: (track: PlayableTrack) => void;
  removeFromQueue: (index: number) => Promise<void>;
  moveInQueue: (from: number, to: number) => void;
  jumpTo: (index: number) => Promise<void>;
  retry: () => Promise<void>;
  stop: () => void;
}

const STORAGE_KEY = 'ordyx.player.v1';
const LOAD_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------- estado interno del controlador
let player: AudioPlayer | null = null;
let audioModeReady: Promise<void> | null = null;
let loadToken = 0;
let loadTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSeekMs = 0;
let session: {
  id: string | null;
  trackId: string;
  listenedMs: number;
  lastTick: number | null;
  lastReport: number;
  completed: boolean;
} | null = null;

function ensureAudioMode() {
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    // `doNotMix` es necesario para los controles de la pantalla de bloqueo y pausa otras apps;
    // el sistema nos pausa durante llamadas y otras interrupciones.
    interruptionMode: 'doNotMix',
  }).catch((e) => reportError(e, { where: 'setAudioMode' }));
  return audioModeReady;
}

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

function clearLoadTimer() {
  if (loadTimer) clearTimeout(loadTimer);
  loadTimer = null;
}

/** Acumula el tiempo REAL escuchado (no la posición): saltar hacia delante no cuenta como escucha. */
function tickListening(playing: boolean) {
  if (!session) return;
  const now = Date.now();
  if (session.lastTick !== null) session.listenedMs += Math.min(now - session.lastTick, 2000);
  session.lastTick = playing ? now : null;
  if (session.id && now - session.lastReport >= PLAY_RULES.heartbeatIntervalMs) {
    session.lastReport = now;
    flushProgress(false);
  }
}

function flushProgress(completed: boolean) {
  if (!session?.id) return;
  const s = session;
  if (completed) s.completed = true;
  reportPlayProgress(s.id!, s.listenedMs, completed).catch((e) =>
    reportError(e, { where: 'reportPlayProgress' }),
  );
}

function onStatus(status: AudioStatus) {
  const state = usePlayer.getState();
  if (status.isLoaded) clearLoadTimer();
  tickListening(status.playing);

  const patch: Partial<PlayerState> = {
    positionMs: Math.round(status.currentTime * 1000),
    isBuffering: status.isBuffering,
  };
  if (status.duration > 0) patch.durationMs = Math.round(status.duration * 1000);
  if (state.status === 'loading' && status.isLoaded) {
    patch.status = status.playing ? 'playing' : 'paused';
  } else if (state.status === 'playing' || state.status === 'paused') {
    patch.status = status.playing ? 'playing' : 'paused';
  }
  usePlayer.setState(patch);

  if (status.didJustFinish) void handleFinished();
}

async function handleFinished() {
  flushProgress(true);
  const { queue } = usePlayer.getState();
  const idx = nextIndex(queue, true);
  if (idx === null) {
    usePlayer.setState({ status: 'paused', positionMs: 0 });
    await player?.seekTo(0).catch(() => undefined);
    persist();
    return;
  }
  usePlayer.setState({ queue: goTo(queue, idx) });
  await loadCurrent(true);
}

async function loadCurrent(autoplay: boolean, startAtMs = 0, isRetry = false) {
  const token = ++loadToken;
  const entry = current(usePlayer.getState().queue);
  if (!entry) return;
  const track = entry.item;
  // Cerrar la sesión de escucha anterior antes de cambiar de pista.
  if (session && session.trackId !== track.id) flushProgress(false);
  clearLoadTimer();
  usePlayer.setState({
    status: 'loading',
    error: null,
    positionMs: startAtMs,
    durationMs: track.durationMs ?? 0,
  });

  try {
    await ensureAudioMode();
    const url = await resolveStreamUrl(track.audioPath);
    if (token !== loadToken) return; // el usuario ya cambió de canción
    const p = getPlayer();
    p.replace({ uri: url });
    pendingSeekMs = startAtMs;
    if (startAtMs > 0) await p.seekTo(startAtMs / 1000).catch(() => undefined);
    if (autoplay) p.play();
    else usePlayer.setState({ status: 'paused' });
    try {
      p.setActiveForLockScreen(
        true,
        { title: track.title, artist: track.artistName, artworkUrl: track.coverUrl ?? undefined },
        {
          showSeekBackward: true,
          showSeekForward: true,
          seekBackwardIntervalSeconds: 15,
          seekForwardIntervalSeconds: 15,
        },
      );
    } catch (e) {
      reportError(e, { where: 'lockScreen' });
    }

    loadTimer = setTimeout(() => {
      if (token !== loadToken) return;
      if (!isRetry) {
        // Posible URL firmada caducada o red lenta: se reintenta una vez con una URL nueva.
        invalidateStreamUrl(track.audioPath);
        void loadCurrent(autoplay, startAtMs, true);
      } else {
        usePlayer.setState({
          status: 'error',
          error: 'No se ha podido cargar la canción. Comprueba tu conexión.',
        });
      }
    }, LOAD_TIMEOUT_MS);

    if (!session || session.trackId !== track.id || session.completed || autoplay) {
      session = {
        id: null,
        trackId: track.id,
        listenedMs: 0,
        lastTick: null,
        lastReport: Date.now(),
        completed: false,
      };
      if (autoplay) {
        const ctx = usePlayer.getState().context;
        const thisSession = session;
        startPlay(track.id, ctx?.type ?? null, ctx?.id ?? null)
          .then((id) => {
            thisSession.id = id;
          })
          .catch((e) => reportError(e, { where: 'startPlay' }));
      }
    }
    persist();
  } catch (e) {
    if (token !== loadToken) return;
    reportError(e, { where: 'loadCurrent', trackId: track.id });
    usePlayer.setState({ status: 'error', error: toUserMessage(e) });
  }
}

// ---------------------------------------------------------------- persistencia (última cola y posición)
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const { queue, positionMs, context } = usePlayer.getState();
    const entries = queue.entries.slice(0, 200).map((e) => e.item);
    const payload = {
      entries,
      index: Math.min(queue.index, entries.length - 1),
      positionMs,
      shuffle: queue.shuffle,
      repeat: queue.repeat,
      context,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => undefined);
  }, 500);
}

export async function restorePlayer() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as {
      entries: PlayableTrack[];
      index: number;
      positionMs: number;
      repeat: RepeatMode;
      context: PlayContext | null;
    };
    if (!saved.entries?.length || saved.index < 0) return;
    usePlayer.setState({
      queue: createQueue(saved.entries, saved.index, { repeat: saved.repeat }),
      context: saved.context,
      status: 'paused',
      positionMs: saved.positionMs,
      durationMs: saved.entries[saved.index]?.durationMs ?? 0,
    });
    restoredPositionMs = saved.positionMs;
  } catch {
    // estado guardado corrupto: se ignora
  }
}
let restoredPositionMs = 0;

export async function clearPersistedPlayer() {
  player?.pause();
  player?.clearLockScreenControls();
  usePlayer.setState({
    queue: emptyQueue(),
    status: 'idle',
    positionMs: 0,
    durationMs: 0,
    context: null,
  });
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------- store público
export const usePlayer = create<PlayerState>((set, get) => ({
  queue: emptyQueue<PlayableTrack>(),
  context: null,
  status: 'idle',
  error: null,
  positionMs: 0,
  durationMs: 0,
  isBuffering: false,

  async playTracks(tracks, startIndex, context) {
    if (tracks.length === 0) return;
    const { queue } = get();
    restoredPositionMs = 0;
    set({
      queue: createQueue(tracks, startIndex, { shuffle: queue.shuffle, repeat: queue.repeat }),
      context,
    });
    await loadCurrent(true);
  },

  async toggle() {
    const { status } = get();
    const p = player;
    if (status === 'playing') {
      p?.pause();
      tickListening(false);
      persist();
      return;
    }
    if (status === 'error') return get().retry();
    if (!p || !p.isLoaded) {
      // Primera reproducción tras restaurar la cola guardada.
      const start = restoredPositionMs;
      restoredPositionMs = 0;
      await loadCurrent(true, start);
      return;
    }
    if (!session || session.completed) {
      session = null;
      const track = current(get().queue)?.item;
      if (track) {
        session = {
          id: null,
          trackId: track.id,
          listenedMs: 0,
          lastTick: null,
          lastReport: Date.now(),
          completed: false,
        };
        const s = session;
        startPlay(track.id, get().context?.type ?? null, get().context?.id ?? null)
          .then((id) => (s.id = id))
          .catch((e) => reportError(e, { where: 'startPlay' }));
      }
    }
    p.play();
  },

  async next() {
    const { queue } = get();
    const idx = nextIndex(queue, false);
    if (idx === null) return;
    set({ queue: goTo(queue, idx) });
    await loadCurrent(true);
  },

  async previous() {
    const { queue, positionMs } = get();
    const idx = previousIndex(queue, positionMs);
    if (idx === queue.index) {
      await player?.seekTo(0).catch(() => undefined);
      set({ positionMs: 0 });
      return;
    }
    set({ queue: goTo(queue, idx) });
    await loadCurrent(true);
  },

  async seek(ms) {
    const clamped = Math.max(0, Math.min(ms, get().durationMs || ms));
    set({ positionMs: clamped });
    if (player?.isLoaded)
      await player.seekTo(clamped / 1000).catch((e) => reportError(e, { where: 'seek' }));
    else restoredPositionMs = clamped;
    persist();
  },

  toggleShuffle() {
    set({ queue: setShuffle(get().queue, !get().queue.shuffle) });
    persist();
  },

  cycleRepeat() {
    set({ queue: cycleRepeat(get().queue) });
    persist();
  },

  addNext(track) {
    const wasEmpty = get().queue.entries.length === 0;
    set({ queue: playNext(get().queue, [track]) });
    if (wasEmpty) void loadCurrent(true);
    persist();
  },

  addToQueue(track) {
    const wasEmpty = get().queue.entries.length === 0;
    set({ queue: enqueue(get().queue, [track]) });
    if (wasEmpty) void loadCurrent(true);
    persist();
  },

  async removeFromQueue(index) {
    const { queue } = get();
    const removingCurrent = index === queue.index;
    const nextQueue = removeAt(queue, index);
    set({ queue: nextQueue });
    if (nextQueue.entries.length === 0) {
      player?.pause();
      set({ status: 'idle' });
    } else if (removingCurrent) {
      await loadCurrent(get().status === 'playing');
    }
    persist();
  },

  moveInQueue(from, to) {
    set({ queue: move(get().queue, from, to) });
    persist();
  },

  async jumpTo(index) {
    set({ queue: goTo(get().queue, index) });
    await loadCurrent(true);
  },

  async retry() {
    const track = current(get().queue)?.item;
    if (!track) return;
    invalidateStreamUrl(track.audioPath);
    await loadCurrent(true, get().positionMs || pendingSeekMs);
  },

  stop() {
    player?.pause();
    tickListening(false);
    flushProgress(false);
    persist();
  },
}));

export function useCurrentTrack(): PlayableTrack | null {
  return usePlayer((s) => current(s.queue)?.item ?? null);
}
