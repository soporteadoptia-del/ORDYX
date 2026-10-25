import Ionicons from '@expo/vector-icons/Ionicons';
import type { Genre } from '@ordyx/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import type { IconName } from '@/components/ui';
import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/** Colores de las tarjetas: la paleta de aurevixweb.es (lima, violeta, azul, ámbar, verde, rojo). */
const TONES = [
  { bg: '#C8F560', fg: '#0C0C0E' },
  { bg: '#B98CFF', fg: '#0C0C0E' },
  { bg: '#1D1D24', fg: '#F3F1EA' },
  { bg: '#60A5FA', fg: '#0C0C0E' },
  { bg: '#FBBF24', fg: '#0C0C0E' },
  { bg: '#2A2A33', fg: '#C8F560' },
  { bg: '#4ADE80', fg: '#0C0C0E' },
  { bg: '#F87171', fg: '#0C0C0E' },
];

const ICONS: Record<string, IconName> = {
  electronica: 'pulse',
  pop: 'star',
  'hip-hop': 'mic',
  rock: 'flash',
  indie: 'leaf',
  lofi: 'cafe',
  ambient: 'cloudy-night',
  jazz: 'musical-notes',
  clasica: 'musical-note',
  urbano: 'business',
  flamenco: 'flame',
  experimental: 'flask',
};

/** Rejilla de géneros con tarjetas de color, icono e inclinación como el logotipo de Aurevix. */
export function GenreGrid({ genres, limit }: { genres: Genre[]; limit?: number }) {
  return (
    <View style={styles.grid}>
      {genres.slice(0, limit).map((g, i) => {
        const tone = TONES[i % TONES.length];
        return (
          <PressableScale
            key={g.id}
            onPress={() =>
              router.push({ pathname: '/genre/[id]', params: { id: String(g.id), name: g.name } })
            }
            scaleTo={0.96}
            style={[
              styles.tile,
              { backgroundColor: tone.bg },
              tone.bg.startsWith('#1') || tone.bg.startsWith('#2') ? styles.outlined : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Género ${g.name}`}
          >
            <View style={[styles.badge, { backgroundColor: tone.fg }]}>
              <Ionicons name={ICONS[g.slug] ?? 'musical-notes'} size={18} color={tone.bg} />
            </View>
            <Text variant="heading" style={{ color: tone.fg }} numberOfLines={1}>
              {g.name}
            </Text>
            <View style={[styles.shape, { borderColor: tone.fg }]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tile: {
    width: '48.5%',
    height: 96,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  outlined: { borderWidth: 1, borderColor: colors.borderStrong },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  shape: {
    position: 'absolute',
    right: -18,
    top: -18,
    width: 70,
    height: 70,
    borderRadius: 18,
    borderWidth: 2,
    opacity: 0.14,
    transform: [{ rotate: '20deg' }],
  },
});
