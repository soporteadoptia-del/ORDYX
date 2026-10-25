/**
 * Reproductor para la versión web (iPhone por Safari y navegadores). Sustituye a expo-audio solo en
 * la web porque este crea un elemento <audio> nuevo en cada canción y le da al play después de
 * esperar a la red: Safari en iPhone exige que el primer play ocurra dentro del toque del usuario
 * y lo bloquea. Aquí hay UN solo elemento que se desbloquea en el primer toque (`unlockWebAudio`)
 * y se reutiliza para todas las canciones, así los play posteriores ya están permitidos.
 */
import type { AudioStatus } from 'expo-audio';

// WAV de silencio de una décima de segundo: sirve para desbloquear el elemento en el primer toque.
const SILENCE =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

type Listener = (s: AudioStatus) => void;

let el: HTMLAudioElement | null = null;
let unlocked = false;

function media(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
  }
  return el;
}

/** Llamar de forma síncrona dentro de un toque (antes de cualquier await). */
export function unlockWebAudio() {
  if (unlocked) return;
  const a = media();
  if (!a.src) a.src = SILENCE;
  const p = a.play();
  unlocked = true;
  p?.then(() => {
    if (a.src === SILENCE) a.pause();
  }).catch((e: Error) => {
    // Solo si el navegador lo ha prohibido; «AbortError» significa que ya llegó la canción.
    if (e?.name === 'NotAllowedError') unlocked = false;
  });
}

export interface WebPlayer {
  readonly isLoaded: boolean;
  replace(source: { uri: string }): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  setPlaybackRate(rate: number, quality?: unknown): void;
  setActiveForLockScreen(
    active: boolean,
    meta?: { title?: string; artist?: string; artworkUrl?: string },
    opts?: unknown,
  ): void;
  clearLockScreenControls(): void;
  addListener(event: 'playbackStatusUpdate', cb: Listener): { remove: () => void };
}

export function createWebPlayer(): WebPlayer {
  const a = media();
  const listeners = new Set<Listener>();
  let loaded = false;
  let ended = false;

  const status = (): AudioStatus =>
    ({
      id: 'web',
      currentTime: a.currentTime || 0,
      duration: Number.isFinite(a.duration) ? a.duration : 0,
      playing: !a.paused && !a.ended,
      isLoaded: loaded,
      isBuffering: a.readyState < 3 && !a.paused,
      didJustFinish: ended,
      loop: false,
      mute: a.muted,
      playbackRate: a.playbackRate,
      shouldCorrectPitch: true,
      playbackState: a.paused ? 'paused' : 'playing',
      timeControlStatus: a.paused ? 'paused' : 'playing',
      reasonForWaitingToPlay: '',
    }) as unknown as AudioStatus;

  const emit = () => {
    const s = status();
    listeners.forEach((l) => l(s));
    ended = false;
  };
  const real = () => a.src && a.src !== SILENCE;

  a.addEventListener('loadedmetadata', () => {
    if (!real()) return;
    loaded = true;
    emit();
  });
  for (const ev of ['play', 'pause', 'timeupdate', 'waiting', 'playing', 'seeked'] as const)
    a.addEventListener(ev, () => real() && emit());
  a.addEventListener('ended', () => {
    if (!real()) return;
    ended = true;
    emit();
  });

  return {
    get isLoaded() {
      return loaded;
    },
    replace({ uri }) {
      loaded = false;
      a.src = uri;
      a.load();
    },
    play() {
      a.play().catch(() => emit());
    },
    pause() {
      a.pause();
    },
    async seekTo(seconds) {
      a.currentTime = seconds;
    },
    setPlaybackRate(rate) {
      a.playbackRate = rate;
      a.defaultPlaybackRate = rate;
    },
    setActiveForLockScreen(active, meta) {
      if (!active || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meta?.title ?? '',
        artist: meta?.artist ?? '',
        artwork: meta?.artworkUrl ? [{ src: meta.artworkUrl, sizes: '512x512' }] : [],
      });
    },
    clearLockScreenControls() {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator)
        navigator.mediaSession.metadata = null;
    },
    addListener(_event, cb) {
      listeners.add(cb);
      return { remove: () => listeners.delete(cb) };
    },
  };
}
