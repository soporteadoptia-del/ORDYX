/** Una línea de letra; `ms` es null si la letra no está sincronizada. */
export interface LyricLine {
  ms: number | null;
  text: string;
}

const TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Lee letras en formato LRC (`[mm:ss.xx] texto`, admite varias marcas por línea) o texto normal.
 * Las etiquetas de metadatos (`[ar:…]`, `[ti:…]`) se ignoran.
 */
export function parseLyrics(raw: string | null | undefined): {
  lines: LyricLine[];
  synced: boolean;
} {
  if (!raw?.trim()) return { lines: [], synced: false };
  const timed: LyricLine[] = [];
  const plain: LyricLine[] = [];
  for (const row of raw.replace(/\r/g, '').split('\n')) {
    const stamps = [...row.matchAll(TAG)];
    const text = row.replace(TAG, '').trim();
    if (stamps.length === 0) {
      if (/^\[[a-z]+:.*\]$/i.test(row.trim())) continue;
      plain.push({ ms: null, text });
      continue;
    }
    for (const m of stamps) {
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0;
      timed.push({ ms: Number(m[1]) * 60_000 + Number(m[2]) * 1000 + frac, text });
    }
  }
  if (timed.length === 0) {
    // Se quitan las líneas vacías del principio y del final.
    while (plain.length && !plain[0].text) plain.shift();
    while (plain.length && !plain[plain.length - 1].text) plain.pop();
    return { lines: plain, synced: false };
  }
  timed.sort((a, b) => a.ms! - b.ms!);
  return { lines: timed, synced: true };
}

/** Índice de la línea que suena en `positionMs` (-1 antes de la primera). */
export function activeLine(lines: LyricLine[], positionMs: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((lines[mid].ms ?? 0) <= positionMs) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}
