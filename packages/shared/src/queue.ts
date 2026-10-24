/**
 * Lógica pura de la cola de reproducción. No depende de ninguna librería de audio,
 * lo que permite probarla de forma aislada y reutilizarla en otros clientes.
 */
export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueEntry<T> {
  /** Clave única de la entrada (una misma canción puede aparecer varias veces). */
  key: string;
  item: T;
}

export interface QueueState<T> {
  entries: QueueEntry<T>[];
  /** Orden original antes de activar el modo aleatorio. */
  original: QueueEntry<T>[];
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

let keyCounter = 0;
export function makeKey(): string {
  keyCounter = (keyCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${keyCounter.toString(36)}`;
}

export function emptyQueue<T>(): QueueState<T> {
  return { entries: [], original: [], index: -1, shuffle: false, repeat: 'off' };
}

export function createQueue<T>(
  items: T[],
  startIndex = 0,
  opts: { shuffle?: boolean; repeat?: RepeatMode; random?: () => number } = {},
): QueueState<T> {
  const entries = items.map((item) => ({ key: makeKey(), item }));
  const index = items.length === 0 ? -1 : clamp(startIndex, 0, items.length - 1);
  const base: QueueState<T> = {
    entries,
    original: entries,
    index,
    shuffle: false,
    repeat: opts.repeat ?? 'off',
  };
  return opts.shuffle ? setShuffle(base, true, opts.random) : base;
}

export function current<T>(state: QueueState<T>): QueueEntry<T> | null {
  return state.entries[state.index] ?? null;
}

/**
 * Calcula el índice siguiente.
 * - `auto`: avance automático al terminar una canción (respeta repeat 'one').
 * - Pulsación manual de "siguiente": salta a la siguiente aunque repeat sea 'one'.
 * Devuelve `null` si la cola ha terminado.
 */
export function nextIndex<T>(state: QueueState<T>, auto: boolean): number | null {
  if (state.entries.length === 0) return null;
  if (auto && state.repeat === 'one') return state.index;
  const candidate = state.index + 1;
  if (candidate < state.entries.length) return candidate;
  return state.repeat === 'off' ? null : 0;
}

/** Si han pasado más de 3 s, "anterior" reinicia la canción actual (devuelve el mismo índice). */
export function previousIndex<T>(state: QueueState<T>, positionMs: number): number {
  if (state.entries.length === 0) return -1;
  if (positionMs > 3000 || state.index <= 0) {
    if (state.index <= 0 && state.repeat === 'all' && positionMs <= 3000) return state.entries.length - 1;
    return Math.max(0, state.index);
  }
  return state.index - 1;
}

export function goTo<T>(state: QueueState<T>, index: number): QueueState<T> {
  if (index < 0 || index >= state.entries.length) return state;
  return { ...state, index };
}

export function cycleRepeat<T>(state: QueueState<T>): QueueState<T> {
  const order: RepeatMode[] = ['off', 'all', 'one'];
  const next = order[(order.indexOf(state.repeat) + 1) % order.length] ?? 'off';
  return { ...state, repeat: next };
}

/** Activa/desactiva el modo aleatorio manteniendo la canción actual en reproducción. */
export function setShuffle<T>(state: QueueState<T>, on: boolean, random: () => number = Math.random): QueueState<T> {
  if (on === state.shuffle) return state;
  const cur = current(state);
  if (on) {
    const rest = state.entries.filter((e) => e.key !== cur?.key);
    shuffleInPlace(rest, random);
    const entries = cur ? [cur, ...rest] : rest;
    return { ...state, original: state.entries, entries, index: cur ? 0 : -1, shuffle: true };
  }
  // Restaurar el orden original conservando entradas añadidas durante el modo aleatorio.
  const known = new Set(state.original.map((e) => e.key));
  const stillPresent = new Set(state.entries.map((e) => e.key));
  const restored = [
    ...state.original.filter((e) => stillPresent.has(e.key)),
    ...state.entries.filter((e) => !known.has(e.key)),
  ];
  const index = cur ? restored.findIndex((e) => e.key === cur.key) : -1;
  return { ...state, entries: restored, original: restored, index, shuffle: false };
}

/** Inserta canciones justo después de la actual ("reproducir a continuación"). */
export function playNext<T>(state: QueueState<T>, items: T[]): QueueState<T> {
  const added = items.map((item) => ({ key: makeKey(), item }));
  const at = state.index + 1;
  const entries = [...state.entries.slice(0, at), ...added, ...state.entries.slice(at)];
  const original = state.shuffle ? [...state.original, ...added] : entries;
  return { ...state, entries, original, index: state.index === -1 ? 0 : state.index };
}

/** Añade canciones al final de la cola. */
export function enqueue<T>(state: QueueState<T>, items: T[]): QueueState<T> {
  const added = items.map((item) => ({ key: makeKey(), item }));
  const entries = [...state.entries, ...added];
  const original = state.shuffle ? [...state.original, ...added] : entries;
  return { ...state, entries, original, index: state.index === -1 && entries.length ? 0 : state.index };
}

export function removeAt<T>(state: QueueState<T>, index: number): QueueState<T> {
  if (index < 0 || index >= state.entries.length) return state;
  const removed = state.entries[index]!;
  const entries = state.entries.filter((_, i) => i !== index);
  const original = state.original.filter((e) => e.key !== removed.key);
  let newIndex = state.index;
  if (index < state.index) newIndex--;
  else if (index === state.index) newIndex = Math.min(state.index, entries.length - 1);
  return { ...state, entries, original, index: entries.length ? newIndex : -1 };
}

export function move<T>(state: QueueState<T>, from: number, to: number): QueueState<T> {
  const n = state.entries.length;
  if (from < 0 || from >= n || to < 0 || to >= n || from === to) return state;
  const entries = [...state.entries];
  const [moved] = entries.splice(from, 1);
  entries.splice(to, 0, moved!);
  const curKey = state.entries[state.index]?.key;
  const index = curKey ? entries.findIndex((e) => e.key === curKey) : state.index;
  return { ...state, entries, original: state.shuffle ? state.original : entries, index };
}

/** Mueve un elemento de un array (útil para reordenar playlists en la UI). */
export function arrayMove<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved!);
  return copy;
}

function shuffleInPlace<T>(arr: T[], random: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
