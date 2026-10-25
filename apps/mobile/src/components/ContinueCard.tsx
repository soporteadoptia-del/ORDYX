import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { colors, fonts, radius, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { PressableScale } from './motion';
import { IconButton, Text } from './ui';

/** «Sigue escuchando»: la canción en la que te quedaste, en grande, arriba del inicio. */
export function ContinueCard() {
  const track = useCurrentTrack();
  const status = usePlayer((s) => s.status);
  const positionMs = usePlayer((s) => s.positionMs);
  const durationMs = usePlayer((s) => s.durationMs);
  const toggle = usePlayer((s) => s.toggle);
  if (!track) return null;

  const playing = status === 'playing';
  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push('/player')}
      accessibilityRole="button"
      accessibilityLabel={`${playing ? 'Suena' : 'Sigue escuchando'}: ${track.title}, ${track.artistName}`}
      style={styles.card}
    >
      <Artwork uri={track.coverUrl} size={88} seed={track.id} />
      <View style={styles.body}>
        <Text variant="micro" style={{ color: colors.onAccent, opacity: 0.7 }}>
          {playing ? 'Suena ahora' : 'Sigue escuchando'}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {track.title}
        </Text>
        <Text variant="caption" style={{ color: colors.onAccent }} numberOfLines={1}>
          {track.artistName}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
      <IconButton
        name={playing ? 'pause' : 'play'}
        label={playing ? 'Pausar' : 'Continuar'}
        size={26}
        color={colors.accent}
        style={styles.play}
        onPress={() => void toggle()}
      />
    </PressableScale>
  );
}

export function PlusStrip({ price }: { price: string }) {
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push('/plus')}
      accessibilityRole="button"
      accessibilityLabel={`Aurevix Plus, ${price} al mes`}
      style={styles.plus}
    >
      <Ionicons name="sparkles" size={20} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">Aurevix Plus</Text>
        <Text variant="caption" muted numberOfLines={2}>
          Sonido original, descargas, letras y tus estadísticas por {price} al mes.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.3, color: colors.onAccent },
  track: {
    height: 3,
    borderRadius: 2,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(12,12,14,0.18)',
    overflow: 'hidden',
  },
  fill: { height: 3, backgroundColor: colors.onAccent },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.onAccent,
  },
  plus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,245,96,0.3)',
    backgroundColor: 'rgba(200,245,96,0.06)',
  },
});
