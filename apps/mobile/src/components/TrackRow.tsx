import { formatDuration } from '@ordyx/shared';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TrackListItem } from '@/api/types';
import { imageUrl } from '@/lib/media';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { colors, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { useTrackActions } from './TrackActions';
import { Badge, IconButton, Text } from './ui';

export const TrackRow = memo(function TrackRow({
  track,
  index,
  onPress,
  showArtwork = true,
  trailing,
}: {
  track: TrackListItem;
  index?: number;
  onPress: () => void;
  showArtwork?: boolean;
  trailing?: React.ReactNode;
}) {
  const currentTrack = useCurrentTrack();
  const status = usePlayer((s) => s.status);
  const isCurrent = currentTrack?.id === track.id;
  const openActions = useTrackActions();
  const cover = imageUrl('covers', track.cover_path) ?? imageUrl('covers', track.artist?.image_path);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => openActions(track)}
      accessibilityRole="button"
      accessibilityLabel={`${track.title}, ${track.artist?.name ?? ''}${isCurrent ? ', reproduciendo' : ''}`}
      accessibilityHint="Reproduce la canción. Mantén pulsado para más opciones"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      {index !== undefined && !showArtwork ? (
        <Text muted style={styles.index}>
          {index + 1}
        </Text>
      ) : null}
      {showArtwork ? <Artwork uri={cover} size={48} seed={track.id} /> : null}
      <View style={styles.meta}>
        <Text numberOfLines={1} variant="bodyStrong" style={isCurrent ? { color: colors.accentStrong } : undefined}>
          {isCurrent && status === 'playing' ? '▶ ' : ''}
          {track.title}
        </Text>
        <View style={styles.subline}>
          {track.is_explicit ? <Badge label="E" tone="muted" /> : null}
          {track.is_demo ? <Badge label="Demo" tone="warning" /> : null}
          <Text muted variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
            {track.artist?.name ?? 'Artista'} · {formatDuration(track.duration_ms)}
          </Text>
        </View>
      </View>
      {trailing ?? <IconButton name="ellipsis-horizontal" label="Más opciones" size={20} color={colors.textMuted} onPress={() => openActions(track)} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  index: { width: 24, textAlign: 'center' },
  meta: { flex: 1, gap: 2 },
  subline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
