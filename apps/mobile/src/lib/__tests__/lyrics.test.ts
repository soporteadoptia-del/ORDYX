import { activeLine, parseLyrics } from '../lyrics';

describe('parseLyrics', () => {
  it('lee LRC con varias marcas y metadatos', () => {
    const { lines, synced } = parseLyrics(
      '[ar:Aurevix]\n[00:12.50]Segunda\n[00:01.00][00:20.00]Estribillo\n[01:02.3]Final',
    );
    expect(synced).toBe(true);
    expect(lines.map((l) => [l.ms, l.text])).toEqual([
      [1000, 'Estribillo'],
      [12500, 'Segunda'],
      [20000, 'Estribillo'],
      [62300, 'Final'],
    ]);
  });

  it('acepta texto sin sincronizar', () => {
    const { lines, synced } = parseLyrics('\nUna\n\nDos\n\n');
    expect(synced).toBe(false);
    expect(lines.map((l) => l.text)).toEqual(['Una', '', 'Dos']);
  });

  it('sin letra devuelve una lista vacía', () => {
    expect(parseLyrics(null).lines).toEqual([]);
  });
});

describe('activeLine', () => {
  const { lines } = parseLyrics('[00:01.00]a\n[00:05.00]b\n[00:09.00]c');
  it('encuentra la línea que suena', () => {
    expect(activeLine(lines, 0)).toBe(-1);
    expect(activeLine(lines, 1000)).toBe(0);
    expect(activeLine(lines, 7000)).toBe(1);
    expect(activeLine(lines, 99000)).toBe(2);
  });
});
