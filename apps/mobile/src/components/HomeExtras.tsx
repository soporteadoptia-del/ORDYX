import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import {
  AUDIUS_GENRES,
  audiusToPlayable,
  getTrendingNow,
  getUndergroundNow,
  type AudiusGenre,
} from '@/api/audius';
import { getGenres, getPopularTracks, getTracksByGenre } from '@/api/catalog';
import { getMyTopGenres } from '@/api/feed';
import { router } from 'expo-router';
import { toPlayable, type PlayableTrack } from '@/player/store';
import { supabase } from '@/lib/supabase';
import { shuffle } from '@/player/radio';
import { usePlayer } from '@/player/store';
import { unlockWebAudio } from '@/player/webAudio';
import { colors, fonts, radius, spacing } from '@/theme';
import { PressableScale } from './motion';
import { useToast } from './Toast';
import { Text } from './ui';

/** Desbloquea el audio en Safari (iPhone) dentro del toque, antes de esperar a la red. */
export function unlockAudioInGesture() {
  if (Platform.OS === 'web') unlockWebAudio();
}

function greeting(h: number) {
  if (h >= 6 && h < 14) return 'Buenos días';
  if (h >= 14 && h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Saludo según la hora; entra una sola vez al abrir la app (no en cada visita a Inicio). */
let greeted = false;
export function Greeting({ name }: { name: string | null }) {
  const reduced = useReducedMotion();
  const [animate] = useState(() => !greeted && !reduced);
  useEffect(() => {
    greeted = true;
  }, []);
  return (
    <Animated.View
      style={[
        styles.greeting,
        animate && {
          animationName: {
            from: { opacity: 0, transform: [{ translateY: 10 }] },
            to: { opacity: 1, transform: [{ translateY: 0 }] },
          },
          animationDuration: '520ms',
          animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
        },
      ]}
    >
      <Text style={styles.hello} numberOfLines={2}>
        {greeting(new Date().getHours())}
        {name ? `, ${name}` : ''}
      </Text>
    </Animated.View>
  );
}

/** Aviso que el propietario escribe en su panel («Aviso de mantenimiento»). */
export function NoticeBanner() {
  const notice = useQuery({
    queryKey: ['app', 'notice'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'maintenance_message')
        .maybeSingle();
      return typeof data?.value === 'string' && data.value.trim() ? data.value.trim() : null;
    },
    staleTime: 300_000,
  });
  if (!notice.data) return null;
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Ionicons name="megaphone" size={18} color={colors.onAccent} />
      <Text style={{ color: colors.onAccent, flex: 1 }}>{notice.data}</Text>
    </View>
  );
}

const RADIO_COLORS: [string, string][] = [
  ['#C8F560', '#7FB82E'],
  ['#B98CFF', '#6E44D6'],
  ['#FF8A5B', '#D9461E'],
  ['#5BD8FF', '#1E8FD9'],
  ['#FFD45B', '#D9A21E'],
  ['#FF6FB5', '#C22E7A'],
  ['#8CFFC8', '#2EB880'],
];

/**
 * Radios por género con música de esta semana (Audius). Un toque y suena una mezcla que no
 * se acaba: es la forma más rápida de poner música sin pensar.
 */
export function RadioRow() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const genres = AUDIUS_GENRES.filter((g) => g.key) as { key: AudiusGenre; label: string }[];

  async function start(key: AudiusGenre) {
    unlockAudioInGesture();
    setBusy(key);
    try {
      const tracks = shuffle((await getTrendingNow(key, 30)).map(audiusToPlayable));
      if (tracks.length) await usePlayer.getState().playTracks(tracks, 0, { type: 'home' });
    } catch {
      toast.show('No hemos podido cargar la radio. Inténtalo de nuevo.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View>
      <View style={styles.radioHead}>
        <Text variant="heading">Radios</Text>
        <Text variant="caption" muted>
          Toca una y suena sin parar
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.radioRow}
      >
        {genres.map((g, i) => (
          <PressableScale
            key={g.key}
            scaleTo={0.95}
            onPress={() => void start(g.key)}
            accessibilityRole="button"
            accessibilityLabel={`Radio ${g.label}`}
          >
            <LinearGradient
              colors={RADIO_COLORS[i % RADIO_COLORS.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.radio}
            >
              <Ionicons name="radio" size={20} color="rgba(12,12,14,0.75)" />
              <View>
                <Text style={styles.radioKicker}>Radio</Text>
                <Text style={styles.radioName} numberOfLines={1}>
                  {g.label}
                </Text>
              </View>
              {busy === g.key ? (
                <ActivityIndicator color={colors.onAccent} style={styles.radioSpin} />
              ) : null}
            </LinearGradient>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

type Mix = {
  key: string;
  kicker: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: [string, string];
  load?: () => Promise<PlayableTrack[]>;
  href?: '/feed';
};

const catalogPlayable = (list: Awaited<ReturnType<typeof getPopularTracks>>) =>
  list.map(toPlayable).filter((t): t is PlayableTrack => !!t);

/**
 * «Hecho para ti» (como los Mix diarios y el Descubrimiento semanal de Spotify): tres mezclas con
 * tus géneros más escuchados, música nueva poco conocida y tu actividad. Se actualizan solas.
 */
export function MadeForYou() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const top = useQuery({ queryKey: ['home', 'top-genres'], queryFn: getMyTopGenres });
  const genres = useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: 3_600_000 });

  const picked = (top.data?.length ? top.data.map((g) => ({ id: g.genre_id, name: g.name })) : [])
    .concat((genres.data ?? []).map((g) => ({ id: g.id, name: g.name })))
    .filter((g, i, all) => all.findIndex((x) => x.id === g.id) === i)
    .slice(0, 3);

  const mixes: Mix[] = [
    ...picked.map((g, i) => ({
      key: `mix-${g.id}`,
      kicker: `Mix diario ${i + 1}`,
      title: g.name,
      icon: 'disc' as const,
      colors: RADIO_COLORS[(i + 2) % RADIO_COLORS.length],
      load: async () => {
        const [own, pop] = await Promise.all([
          getTracksByGenre(g.id).catch(() => []),
          getPopularTracks(30).catch(() => []),
        ]);
        const audius = await getTrendingNow(null, 20).catch(() => []);
        return shuffle([...catalogPlayable(own), ...catalogPlayable(pop).slice(0, 10)])
          .concat(shuffle(audius.map(audiusToPlayable)))
          .filter((t, idx, all) => all.findIndex((x) => x.id === t.id) === idx);
      },
    })),
    {
      key: 'discover',
      kicker: 'Descubrimiento',
      title: 'Semanal',
      icon: 'telescope',
      colors: ['#B98CFF', '#2B2140'],
      load: async () => shuffle((await getUndergroundNow(30)).map(audiusToPlayable)),
    },
    {
      key: 'feed',
      kicker: 'Lo nuevo de',
      title: 'Lo que sigues',
      icon: 'people',
      colors: ['#C8F560', '#2B3A12'],
      href: '/feed',
    },
  ];

  async function open(m: Mix) {
    if (m.href) return router.push(m.href);
    unlockAudioInGesture();
    setBusy(m.key);
    try {
      const tracks = await m.load!();
      if (tracks.length) await usePlayer.getState().playTracks(tracks, 0, { type: 'home' });
      else toast.show('Aún no hay canciones para esta mezcla', 'error');
    } catch {
      toast.show('No hemos podido preparar la mezcla. Inténtalo de nuevo.', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View>
      <View style={styles.radioHead}>
        <Text variant="heading">Hecho para ti</Text>
        <Text variant="caption" muted>
          Se renueva cada día
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.radioRow}
      >
        {mixes.map((m) => (
          <PressableScale
            key={m.key}
            scaleTo={0.95}
            onPress={() => void open(m)}
            accessibilityRole="button"
            accessibilityLabel={`${m.kicker} ${m.title}`}
          >
            <LinearGradient
              colors={m.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mix}
            >
              <Ionicons name={m.icon} size={26} color="rgba(255,255,255,0.9)" />
              <View>
                <Text style={styles.mixKicker}>{m.kicker}</Text>
                <Text style={styles.mixTitle} numberOfLines={2}>
                  {m.title}
                </Text>
              </View>
              {busy === m.key ? (
                <ActivityIndicator color={colors.text} style={styles.radioSpin} />
              ) : null}
            </LinearGradient>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mix: {
    width: 156,
    height: 156,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  mixKicker: { fontFamily: fonts.bodyStrong, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  mixTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.6,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 6,
  },
  greeting: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  hello: {
    fontFamily: fonts.displayHeavy,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1,
    color: colors.text,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  radioHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  radioRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  radio: {
    width: 128,
    height: 128,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  radioKicker: { fontFamily: fonts.bodyStrong, fontSize: 12, color: 'rgba(12,12,14,0.7)' },
  radioName: {
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    letterSpacing: -0.6,
    color: colors.onAccent,
  },
  radioSpin: { position: 'absolute', top: spacing.md, right: spacing.md },
});
