import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPopularTracks } from '@/api/catalog';
import { shufflePlay } from '@/player/play';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { colors, fonts } from '@/theme';
import { MiniPlayer } from './MiniPlayer';
import { NowPlayingBars, PressableScale } from './motion';
import { Text, type IconName } from './ui';

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home', 'home-outline'],
  search: ['compass', 'compass-outline'],
  library: ['albums', 'albums-outline'],
  me: ['person-circle', 'person-circle-outline'],
};

/**
 * Barra propia de Aurevix: cuatro pestañas y, en el centro, «Ahora». Si algo suena abre el
 * reproductor con su portada; si no, pone una mezcla de lo más escuchado. Así la música está
 * siempre a un toque, en el sitio donde cae el pulgar.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <PressableScale
        key={route.key}
        onPress={onPress}
        scaleTo={0.92}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        style={styles.tab}
      >
        <Ionicons
          name={focused ? on : off}
          size={23}
          color={focused ? colors.accent : colors.textSubtle}
        />
        <Text style={[styles.label, { color: focused ? colors.text : colors.textSubtle }]}>
          {label}
        </Text>
      </PressableScale>
    );
  });

  return (
    <View style={styles.wrap}>
      {/* Hueco para que el botón «Ahora», que sobresale de la barra, no tape el mini reproductor. */}
      <View style={{ paddingBottom: 12 }}>
        <MiniPlayer />
      </View>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]} accessibilityRole="tablist">
        {routes.slice(0, 2)}
        <NowButton />
        {routes.slice(2)}
      </View>
    </View>
  );
}

function NowButton() {
  const track = useCurrentTrack();
  const status = usePlayer((s) => s.status);
  const playing = status === 'playing';

  async function onPress() {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (track) return router.push('/player');
    const tracks = await getPopularTracks(30).catch(() => []);
    if (tracks.length) await shufflePlay(tracks, { type: 'home' });
  }

  return (
    <PressableScale
      onPress={() => void onPress()}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={
        track ? `Ahora suena ${track.title}. Abrir reproductor` : 'Ahora: poner una mezcla'
      }
      style={styles.now}
    >
      {/* Disco lima: ecualizador si suena, play si hay algo en pausa, aleatorio si no hay nada. */}
      <View style={styles.nowDisc}>
        {playing ? (
          <NowPlayingBars playing color={colors.onAccent} size={22} />
        ) : (
          <Ionicons
            name={track ? 'play' : 'shuffle'}
            size={24}
            color={colors.onAccent}
            style={track ? { marginLeft: 3 } : undefined}
          />
        )}
      </View>
      <Text style={[styles.label, { color: colors.accent }]}>Ahora</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 6, minHeight: 48 },
  label: { fontFamily: fonts.bodyStrong, fontSize: 11, lineHeight: 14 },
  now: { flex: 1, alignItems: 'center', gap: 3 },
  nowDisc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Anillo del color del fondo: separa el disco de la barra y del mini reproductor.
    borderWidth: 4,
    borderColor: colors.background,
  },
});
