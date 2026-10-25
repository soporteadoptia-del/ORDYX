import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type AudioQuality = 'standard' | 'max';
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

interface PlayerPrefs {
  /** Calidad preferida. «max» (Premium) usa el archivo original cuando existe una versión aparte. */
  quality: AudioQuality;
  rate: number;
  /** «Seguir sonando» (Premium): al acabar la cola, sigue con música parecida. */
  autoplay: boolean;
  setAutoplay: (on: boolean) => void;
  /** Ahorro de datos: siempre la versión ligera del audio, aunque tengas Premium. */
  dataSaver: boolean;
  setDataSaver: (on: boolean) => void;
  setQuality: (q: AudioQuality) => void;
  setRate: (r: number) => void;
}

const KEY = 'aurevix.player.prefs.v1';

export const usePlayerPrefs = create<PlayerPrefs>((set, get) => ({
  quality: 'max',
  rate: 1,
  autoplay: true,
  dataSaver: false,
  setDataSaver(dataSaver) {
    set({ dataSaver });
    save(get());
  },
  setAutoplay(autoplay) {
    set({ autoplay });
    save(get());
  },
  setQuality(quality) {
    set({ quality });
    save(get());
  },
  setRate(rate) {
    set({ rate });
    save(get());
  },
}));

function save({ quality, rate, autoplay, dataSaver }: PlayerPrefs) {
  AsyncStorage.setItem(KEY, JSON.stringify({ quality, rate, autoplay, dataSaver })).catch(
    () => undefined,
  );
}

export async function restorePlayerPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<
      Pick<PlayerPrefs, 'quality' | 'rate' | 'autoplay' | 'dataSaver'>
    >;
    usePlayerPrefs.setState({
      quality: p.quality === 'standard' ? 'standard' : 'max',
      rate: PLAYBACK_RATES.includes(p.rate as never) ? (p.rate as number) : 1,
      autoplay: p.autoplay !== false,
      dataSaver: p.dataSaver === true,
    });
  } catch {
    // preferencias corruptas: se usan las de por defecto
  }
}

export const rateLabel = (r: number) => `${String(r).replace('.', ',')}×`;
