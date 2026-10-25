import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cubicBezier,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors } from '@/theme';
import { Artwork } from './Artwork';
import { EASE_OUT } from './motion';

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 650;

function tick() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Portada del reproductor que se maneja con el dedo: deslizar a los lados cambia de canción y
 * hacia abajo cierra el reproductor. Un gesto rápido basta (velocidad o distancia). Cuando la
 * canción está en pausa la portada se encoge un poco, como en un tocadiscos que se detiene.
 *
 * Con Premium, detrás de la portada laten dos aros lima al ritmo de la música («Modo visual»).
 */
export function PlayerArt({
  uri,
  seed,
  size,
  playing,
  visualizer,
  onNext,
  onPrevious,
  onClose,
}: {
  uri: string | null;
  seed: string;
  size: number;
  playing: boolean;
  visualizer: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onUpdate((e) => {
      // Resistencia: cuanto más se arrastra, menos se mueve (no hay un tope seco).
      x.set(e.translationX * 0.7);
      y.set(Math.max(0, e.translationY) * 0.6);
    })
    .onEnd((e) => {
      const horizontal = Math.abs(e.translationX) > Math.abs(e.translationY);
      if (
        horizontal &&
        (Math.abs(e.translationX) > SWIPE_DISTANCE || Math.abs(e.velocityX) > SWIPE_VELOCITY)
      ) {
        scheduleOnRN(tick);
        scheduleOnRN(e.translationX < 0 ? onNext : onPrevious);
      } else if (
        !horizontal &&
        (e.translationY > SWIPE_DISTANCE * 1.4 || e.velocityY > SWIPE_VELOCITY * 1.4)
      ) {
        scheduleOnRN(onClose);
      }
      x.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityX }));
      y.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityY }));
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${x.get() / 40}deg` }],
  }));

  // En pausa la portada se encoge un poco (400 ms, ease-out fuerte); nunca con «reducir movimiento».
  const rest = useSharedValue(1);
  useEffect(() => {
    rest.set(withTiming(playing || reduced ? 1 : 0.9, { duration: 400, easing: EASE_OUT }));
  }, [playing, reduced, rest]);
  const restStyle = useAnimatedStyle(() => ({ transform: [{ scale: rest.get() }] }));

  const pulse = visualizer && playing && !reduced;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {visualizer
        ? [0, 1].map((i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.ring,
                { width: size, height: size, borderRadius: size * 0.12 },
                !pulse && { opacity: 0 },
                pulse && {
                  animationName: {
                    '0%': { transform: [{ scale: 1 }], opacity: 0.55 },
                    '100%': { transform: [{ scale: 1.18 }], opacity: 0 },
                  },
                  animationDuration: '1800ms',
                  animationDelay: `${i * 900}ms`,
                  animationIterationCount: 'infinite',
                  animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
                },
              ]}
            />
          ))
        : null}
      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityHint="Desliza a los lados para cambiar de canción o hacia abajo para cerrar"
          style={[dragStyle]}
        >
          <Animated.View style={restStyle}>
            <Artwork uri={uri} size={size} seed={seed} style={styles.shadow} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
});
