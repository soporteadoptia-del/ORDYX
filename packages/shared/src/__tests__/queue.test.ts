import { describe, expect, it } from 'vitest';
import {
  createQueue,
  current,
  cycleRepeat,
  enqueue,
  move,
  nextIndex,
  playNext,
  previousIndex,
  removeAt,
  setShuffle,
  goTo,
  arrayMove,
} from '../queue';

const ids = (q: { entries: { item: string }[] }) => q.entries.map((e) => e.item);
const seeded = () => {
  let s = 42;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

describe('cola de reproducción', () => {
  it('avanza y termina con repeat off', () => {
    const q = createQueue(['a', 'b', 'c'], 1);
    expect(current(q)?.item).toBe('b');
    expect(nextIndex(q, true)).toBe(2);
    expect(nextIndex(goTo(q, 2), true)).toBeNull();
  });

  it('repeat all vuelve al principio y repeat one repite solo en avance automático', () => {
    let q = goTo(createQueue(['a', 'b']), 1);
    q = cycleRepeat(q);
    expect(q.repeat).toBe('all');
    expect(nextIndex(q, true)).toBe(0);
    q = cycleRepeat(q);
    expect(q.repeat).toBe('one');
    expect(nextIndex(q, true)).toBe(1);
    expect(nextIndex(q, false)).toBe(0);
    expect(cycleRepeat(q).repeat).toBe('off');
  });

  it('anterior reinicia la canción si han pasado más de 3 s', () => {
    const q = goTo(createQueue(['a', 'b', 'c']), 2);
    expect(previousIndex(q, 10_000)).toBe(2);
    expect(previousIndex(q, 1000)).toBe(1);
    expect(previousIndex(goTo(q, 0), 1000)).toBe(0);
  });

  it('el modo aleatorio conserva la canción actual al principio y se puede deshacer', () => {
    const q = goTo(createQueue(['a', 'b', 'c', 'd', 'e']), 2);
    const s = setShuffle(q, true, seeded());
    expect(current(s)?.item).toBe('c');
    expect(s.index).toBe(0);
    expect([...ids(s)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    const back = setShuffle(s, false);
    expect(ids(back)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(current(back)?.item).toBe('c');
  });

  it('las canciones añadidas durante el modo aleatorio se conservan al desactivarlo', () => {
    let q = setShuffle(createQueue(['a', 'b', 'c']), true, seeded());
    q = enqueue(q, ['z']);
    const back = setShuffle(q, false);
    expect(ids(back)).toEqual(['a', 'b', 'c', 'z']);
  });

  it('reproducir a continuación inserta tras la actual', () => {
    const q = playNext(goTo(createQueue(['a', 'b', 'c']), 0), ['x', 'y']);
    expect(ids(q)).toEqual(['a', 'x', 'y', 'b', 'c']);
    expect(current(q)?.item).toBe('a');
  });

  it('eliminar ajusta el índice actual', () => {
    const q = goTo(createQueue(['a', 'b', 'c']), 2);
    const r = removeAt(q, 0);
    expect(ids(r)).toEqual(['b', 'c']);
    expect(current(r)?.item).toBe('c');
    const last = removeAt(goTo(createQueue(['a']), 0), 0);
    expect(last.index).toBe(-1);
  });

  it('mover mantiene la canción actual', () => {
    const q = goTo(createQueue(['a', 'b', 'c', 'd']), 1);
    const m = move(q, 3, 0);
    expect(ids(m)).toEqual(['d', 'a', 'b', 'c']);
    expect(current(m)?.item).toBe('b');
    expect(arrayMove([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  });

  it('cola vacía', () => {
    const q = createQueue<string>([]);
    expect(q.index).toBe(-1);
    expect(nextIndex(q, true)).toBeNull();
    expect(enqueue(q, ['a']).index).toBe(0);
  });
});
