import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { Text } from './ui';

type Tone = 'info' | 'success' | 'error';
const ToastContext = createContext<{ show: (message: string, tone?: Tone) => void }>({
  show: () => undefined,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToast(null),
        );
      }, 2800);
    },
    [opacity],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { top: insets.top + spacing.sm, opacity }]}
        >
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.toast,
              {
                borderLeftColor:
                  toast.tone === 'error'
                    ? colors.danger
                    : toast.tone === 'success'
                      ? colors.success
                      : colors.accent,
              },
            ]}
          >
            <Text variant="bodyStrong">{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 1000 },
  toast: {
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
