/**
 * Pruebas del controlador del reproductor con expo-audio y la API simulados:
 * comprueban cola, cambio de pista, avance automático, repetición y registro de escuchas.
 */
const mockListeners: ((s: unknown) => void)[] = [];
const mockPlayer = {
  isLoaded: false,
  replace: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
  setActiveForLockScreen: jest.fn(),
  clearLockScreenControls: jest.fn(),
  addListener: jest.fn((_e: string, cb: (s: unknown) => void) => mockListeners.push(cb)),
};
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => mockPlayer,
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockStartPlay = jest.fn((_id: string, _ctx: string | null, _ctxId: string | null) =>
  Promise.resolve('session-1'),
);
const mockReportPlayProgress = jest.fn((_s: string, _ms: number, _c: boolean) => Promise.resolve());
jest.mock('@/api/plays', () => ({
  startPlay: (id: string, c: string | null, ci: string | null) => mockStartPlay(id, c, ci),
  reportPlayProgress: (s: string, ms: number, c: boolean) => mockReportPlayProgress(s, ms, c),
}));
jest.mock('@/lib/media', () => ({
  imageUrl: () => null,
  resolveStreamUrl: (path: string) => Promise.resolve(`https://cdn.test/${path}?token=x`),
  invalidateStreamUrl: jest.fn(),
}));
jest.mock('@/lib/errors', () => ({
  reportError: jest.fn(),
  toUserMessage: (e: unknown) => String(e),
}));

import { usePlayer, type PlayableTrack } from '../store';

const track = (id: string): PlayableTrack => ({
  id,
  title: `Canción ${id}`,
  artistName: 'Artista',
  artistId: 'a',
  coverUrl: null,
  audioPath: `u/${id}/original.mp3`,
  durationMs: 180_000,
  isDemo: true,
});
const emit = (
  s: Partial<{
    currentTime: number;
    duration: number;
    playing: boolean;
    isLoaded: boolean;
    didJustFinish: boolean;
    isBuffering: boolean;
  }>,
) =>
  mockListeners.forEach((l) =>
    l({
      currentTime: 0,
      duration: 180,
      playing: true,
      isLoaded: true,
      didJustFinish: false,
      isBuffering: false,
      ...s,
    }),
  );
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
});

test('reproduce la URL firmada real de la canción elegida y activa los controles de bloqueo', async () => {
  await usePlayer.getState().playTracks([track('1'), track('2')], 1, { type: 'playlist', id: 'p' });
  expect(mockPlayer.replace).toHaveBeenCalledWith({
    uri: 'https://cdn.test/u/2/original.mp3?token=x',
  });
  expect(mockPlayer.play).toHaveBeenCalled();
  expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(
    true,
    expect.objectContaining({ title: 'Canción 2' }),
    expect.any(Object),
  );
  expect(mockStartPlay).toHaveBeenCalledWith('2', 'playlist', 'p');
  emit({ currentTime: 1 });
  expect(usePlayer.getState().status).toBe('playing');
});

test('al terminar una canción avanza a la siguiente y comunica la escucha completa', async () => {
  await usePlayer.getState().playTracks([track('1'), track('2')], 0, { type: 'home' });
  await flush();
  emit({ currentTime: 179, didJustFinish: true });
  await flush();
  await flush();
  expect(mockReportPlayProgress).toHaveBeenCalledWith('session-1', expect.any(Number), true);
  expect(mockPlayer.replace).toHaveBeenLastCalledWith({
    uri: 'https://cdn.test/u/2/original.mp3?token=x',
  });
});

test('con repetir una canción, el avance automático vuelve a cargar la misma', async () => {
  await usePlayer.getState().playTracks([track('1'), track('2')], 0, { type: 'home' });
  usePlayer.getState().cycleRepeat(); // all
  usePlayer.getState().cycleRepeat(); // one
  emit({ didJustFinish: true });
  await flush();
  await flush();
  expect(mockPlayer.replace).toHaveBeenLastCalledWith({
    uri: 'https://cdn.test/u/1/original.mp3?token=x',
  });
});

test('siguiente / anterior y pausa', async () => {
  await usePlayer.getState().playTracks([track('1'), track('2'), track('3')], 0, { type: 'home' });
  await usePlayer.getState().next();
  expect(usePlayer.getState().queue.index).toBe(1);
  await usePlayer.getState().previous();
  expect(usePlayer.getState().queue.index).toBe(0);
  emit({ playing: true });
  await usePlayer.getState().toggle();
  expect(mockPlayer.pause).toHaveBeenCalled();
});

test('si la URL no se puede obtener muestra un error recuperable', async () => {
  const media = jest.requireMock('@/lib/media') as {
    resolveStreamUrl: (p: string) => Promise<string>;
  };
  const original = media.resolveStreamUrl;
  media.resolveStreamUrl = () => Promise.reject(new Error('Network request failed'));
  await usePlayer.getState().playTracks([track('9')], 0, { type: 'home' });
  expect(usePlayer.getState().status).toBe('error');
  media.resolveStreamUrl = original;
});
