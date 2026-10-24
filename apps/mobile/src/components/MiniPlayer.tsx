import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLikes } from '@/hooks/useLikes';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { colors, MINI_PLAYER_HEIGHT, radius, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { IconButton, Text } from './ui';

/** Reproductor persistente que se mantiene visible sobre la barra de pestañas al navegar. */
export function MiniPlayer() {
  const track = useCurrentTrack();
  const status = usePlayer((s) => s.status);
  const positionMs = usePlayer((s) => s.positionMs);
  const durationMs = usePlayer((s) => s.durationMs);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const { isLiked, toggle: toggleLike } = useLikes();
  if (!track) return null;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  return (
    <Pressable
      onPress={() => router.push('/player')}
      accessibilityRole="button"
      accessibilityLabel={`Reproductor: ${track.title}, ${track.artistName}. Abrir reproductor completo`}
      style={styles.wrap}
    >
      <View style={styles.inner}>
        <Artwork uri={track.coverUrl} size={44} seed={track.id} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {track.title}
          </Text>
          <Text variant="caption" muted numberOfLines={1}>
            {status === 'error' ? 'Error de reproducción · toca para reintentar' : track.artistName}
          </Text>
        </View>
        <IconButton
          name={isLiked(track.id) ? 'heart' : 'heart-outline'}
          color={isLiked(track.id) ? colors.accentWarm : colors.text}
          label={isLiked(track.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          onPress={() => toggleLike(track.id)}
        />
        {status === 'loading' ? (
          <ActivityIndicator color={colors.text} style={{ width: 32 }} />
        ) : (
          <IconButton
            name={status === 'playing' ? 'pause' : status === 'error' ? 'refresh' : 'play'}
            label={status === 'playing' ? 'Pausar' : 'Reproducir'}
            size={28}
            onPress={() => void toggle()}
          />
        )}
        <IconButton name="play-skip-forward" label="Siguiente" onPress={() => void next()} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MINI_PLAYER_HEIGHT,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  progressTrack: { height: 2, backgroundColor: colors.border },
  progressFill: { height: 2, backgroundColor: colors.accentStrong },
});
