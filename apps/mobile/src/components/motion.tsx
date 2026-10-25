import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useReducedMotion } from 'react-native-reanimated';
import { colors } from '@/theme';

/** Curvas de Emil Kowalski: ease-out fuerte para la interfaz; nunca ease-in. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_OUT_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<ComponentProps<typeof Pressable>, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Escala al pulsar: 0.97 por defecto; 0.96 en tarjetas grandes. */
  scaleTo?: number;
};

/**
 * Pulsable con respuesta inmediata al tocar (escala 0.97 en 120 ms, transición CSS de Reanimated
 * en el hilo de interfaz). Sustituye al cambio de opacidad: la escala se lleva el texto y los
 * iconos y se siente física. Con «reducir movimiento» solo baja un poco la opacidad.
 */
export function PressableScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  hitSlop = 4,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <AnimatedPressable
      {...rest}
      hitSlop={hitSlop}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[
        style,
        PRESS_TRANSITION,
        pressed && (reduced ? { opacity: 0.85 } : { transform: [{ scale: scaleTo }] }),
      ]}
    />
  );
}

/**
 * Barras de ecualizador para la canción que suena. Indica el estado (sonando o en pausa) sin
 * recurrir a un glifo; en pausa las barras se quedan quietas a media altura.
 */
export function NowPlayingBars({
  playing,
  color = colors.accent,
  size = 14,
}: {
  playing: boolean;
  color?: string;
  size?: number;
}) {
  const reduced = useReducedMotion();
  const animate = playing && !reduced;
  return (
    <View style={[styles.bars, { width: size, height: size, gap: size / 7 }]} accessible={false}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { backgroundColor: color, height: animate ? '100%' : `${[55, 85, 40][i]}%` },
            animate && {
              animationName: {
                '0%': { transform: [{ scaleY: 0.3 }] },
                '50%': { transform: [{ scaleY: 1 }] },
                '100%': { transform: [{ scaleY: 0.3 }] },
              },
              animationDuration: `${[900, 700, 1100][i]}ms`,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
              animationDelay: `${i * -240}ms`,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Bloque de carga con la forma del contenido que va a llegar, para que la pantalla no salte al
 * cargar. Late suavemente (opacidad) salvo con «reducir movimiento».
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        styles.skeleton,
        style,
        !reduced && {
          animationName: {
            '0%': { opacity: 0.55 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.55 },
          },
          animationDuration: '1400ms',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const PRESS_TRANSITION = {
  transitionProperty: ['transform', 'opacity'],
  transitionDuration: '120ms',
  transitionTimingFunction: EASE_OUT_CSS,
} as const;

const styles = StyleSheet.create({
  bars: { width: 14, height: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, borderRadius: 1, transformOrigin: 'bottom' },
  skeleton: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6 },
});
