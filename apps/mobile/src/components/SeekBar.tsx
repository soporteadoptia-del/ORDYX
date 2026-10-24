import { formatDuration } from '@ordyx/shared';
import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { colors, spacing } from '@/theme';
import { Text } from './ui';

/** Barra de progreso arrastrable y accesible (ajustable con los gestos de VoiceOver/TalkBack). */
export function SeekBar({ positionMs, durationMs, onSeek }: { positionMs: number; durationMs: number; onSeek: (ms: number) => void }) {
  const [width, setWidth] = useState(1);
  const [dragMs, setDragMs] = useState<number | null>(null);
  const widthRef = useRef(1);
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;
  const startX = useRef(0);

  const toMs = (x: number) => Math.max(0, Math.min(1, x / widthRef.current)) * durationRef.current;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        setDragMs(toMs(startX.current));
      },
      onPanResponderMove: (_e, g) => setDragMs(toMs(startX.current + g.dx)),
      onPanResponderRelease: (_e, g) => {
        onSeekRef.current(toMs(startX.current + g.dx));
        setDragMs(null);
      },
      onPanResponderTerminate: () => setDragMs(null),
    }),
  ).current;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const shown = dragMs ?? positionMs;
  const ratio = durationMs > 0 ? Math.min(1, shown / durationMs) : 0;

  return (
    <View>
      <View
        onLayout={(e: LayoutChangeEvent) => {
          widthRef.current = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        style={styles.touch}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Progreso de la canción"
        accessibilityValue={{ min: 0, max: Math.round(durationMs / 1000), now: Math.round(shown / 1000), text: `${formatDuration(shown)} de ${formatDuration(durationMs)}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onSeek(shown + (e.nativeEvent.actionName === 'increment' ? 15000 : -15000))}
        {...responder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: ratio * width }]} />
        </View>
        <View style={[styles.thumb, { left: ratio * width - 7 }, dragMs !== null && styles.thumbActive]} />
      </View>
      <View style={styles.times}>
        <Text variant="caption" muted>
          {formatDuration(shown)}
        </Text>
        <Text variant="caption" muted>
          {formatDuration(durationMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { height: 28, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.text },
  thumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.text, top: 7 },
  thumbActive: { transform: [{ scale: 1.3 }], backgroundColor: colors.accentStrong },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
