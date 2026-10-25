import { formatDuration } from '@ordyx/shared';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { colors, spacing } from '@/theme';
import { Text } from './ui';

/** Barra de progreso arrastrable y accesible (ajustable con los gestos de VoiceOver/TalkBack). */
export function SeekBar({
  positionMs,
  durationMs,
  onSeek,
}: {
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const [dragMs, setDragMs] = useState<number | null>(null);
  // Los manejadores del gesto leen los valores actuales a través de refs (solo en eventos, no al renderizar).
  const latest = useRef({ width: 1, durationMs, onSeek, startX: 0 });
  useEffect(() => {
    latest.current.durationMs = durationMs;
    latest.current.onSeek = onSeek;
  }, [durationMs, onSeek]);

  // El ref solo se lee dentro de los manejadores del gesto (eventos), nunca durante el render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const toMs = (x: number) =>
      Math.max(0, Math.min(1, x / latest.current.width)) * latest.current.durationMs;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        latest.current.startX = e.nativeEvent.locationX;
        setDragMs(toMs(latest.current.startX));
      },
      onPanResponderMove: (_e, g) => setDragMs(toMs(latest.current.startX + g.dx)),
      onPanResponderRelease: (_e, g) => {
        latest.current.onSeek(toMs(latest.current.startX + g.dx));
        setDragMs(null);
      },
      onPanResponderTerminate: () => setDragMs(null),
    });
  });

  const shown = dragMs ?? positionMs;
  const ratio = durationMs > 0 ? Math.min(1, shown / durationMs) : 0;

  return (
    <View>
      <View
        onLayout={(e: LayoutChangeEvent) => {
          latest.current.width = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        style={styles.touch}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Progreso de la canción"
        accessibilityValue={{
          min: 0,
          max: Math.round(durationMs / 1000),
          now: Math.round(shown / 1000),
          text: `${formatDuration(shown)} de ${formatDuration(durationMs)}`,
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onSeek(shown + (e.nativeEvent.actionName === 'increment' ? 15000 : -15000))
        }
        {...responder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: ratio * width }]} />
        </View>
        <View
          style={[styles.thumb, { left: ratio * width - 7 }, dragMs !== null && styles.thumbActive]}
        />
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
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.text,
    top: 7,
  },
  thumbActive: { transform: [{ scale: 1.3 }], backgroundColor: colors.accentStrong },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
