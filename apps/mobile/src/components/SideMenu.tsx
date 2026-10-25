import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { getNotifications } from '@/api/me';
import { getUnreadMessages } from '@/api/together';
import { usePlus } from '@/hooks/usePlus';
import { imageUrl } from '@/lib/media';
import { safeBottom, safeTop } from '@/lib/safe-area';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { PressableScale } from './motion';
import { Text, type IconName } from './ui';

/** Curva de los cajones de iOS (Emil Kowalski): sale rápido y se asienta suave. */
const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);

interface Item {
  icon: IconName;
  label: string;
  href: Href;
  count?: number;
  accent?: boolean;
}

/**
 * Menú lateral (como el de Spotify al tocar tu foto): perfil, Premium y todos los accesos de la
 * cuenta en un sitio. Entra desde la izquierda en 300 ms y se puede arrastrar para cerrarlo.
 */
export function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { profile, isStaff } = useAuth();
  const plus = usePlus();
  const unreadMsgs = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: getUnreadMessages,
    enabled: visible,
  });
  const notifs = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: visible,
  });
  const unreadNotifs = (notifs.data ?? []).filter((n) => !n.read_at).length;

  const items: Item[] = [
    { icon: 'chatbubbles-outline', label: 'Mensajes', href: '/messages', count: unreadMsgs.data },
    {
      icon: 'notifications-outline',
      label: 'Tus avisos',
      href: '/notifications',
      count: unreadNotifs,
    },
    { icon: 'pulse-outline', label: 'Actividad', href: '/feed' },
    { icon: 'git-merge-outline', label: 'Fusión', href: '/blend' },
    { icon: 'stats-chart-outline', label: 'Estadísticas de escucha', href: '/stats' },
    { icon: 'time-outline', label: 'Recientes', href: '/history' },
    { icon: 'download-outline', label: 'Importar listas', href: '/import' },
    { icon: 'arrow-down-circle-outline', label: 'Descargas', href: '/downloads' },
    { icon: 'cloud-upload-outline', label: 'Estudio de artista', href: '/studio' },
    { icon: 'people-outline', label: 'Invitar a amigos', href: '/invite' },
    { icon: 'settings-outline', label: 'Configuración y privacidad', href: '/settings' },
    ...(isStaff
      ? [
          {
            icon: 'shield-checkmark-outline' as IconName,
            label: 'Panel del propietario',
            href: '/owner' as Href,
            accent: true,
          },
        ]
      : []),
  ];

  // El panel va en el hilo de interfaz: entra con la curva de los cajones de iOS, sigue al dedo
  // al arrastrarlo y, al soltar, se cierra o vuelve a su sitio con un muelle (velocidad incluida).
  const { width } = useWindowDimensions();
  const panelW = Math.min(width * 0.84, 360);
  const x = useSharedValue(-panelW);
  useEffect(() => {
    if (visible) x.set(reduced ? 0 : withTiming(0, { duration: 300, easing: EASE_DRAWER }));
  }, [visible, reduced, x]);

  const close = () => {
    x.set(
      withTiming(-panelW, { duration: reduced ? 0 : 200, easing: EASE_DRAWER }, (done) => {
        if (done) scheduleOnRN(onClose);
      }),
    );
  };

  const swipeClose = Gesture.Pan()
    .activeOffsetX(-12)
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      // A la derecha no pasa del borde: resistencia en vez de tope seco.
      x.set(e.translationX < 0 ? e.translationX : e.translationX * 0.15);
    })
    .onEnd((e) => {
      if (e.translationX < -panelW * 0.3 || e.velocityX < -500) {
        x.set(
          withTiming(-panelW, { duration: 180, easing: EASE_DRAWER }, (done) => {
            if (done) scheduleOnRN(onClose);
          }),
        );
      } else {
        x.set(withSpring(0, { duration: 300, dampingRatio: 0.85, velocity: e.velocityX }));
      }
    });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-panelW, 0], [0, 1], Extrapolation.CLAMP),
  }));

  // Al elegir una opción el menú desaparece al instante (sin animación de salida): así no
  // vuelve a asomar al regresar a Inicio.
  const go = (href: Href) => {
    x.set(-panelW);
    onClose();
    router.push(href);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Cerrar menú" />
        </Animated.View>
        <GestureDetector gesture={swipeClose}>
          <Animated.View
            style={[
              styles.panel,
              {
                width: panelW,
                paddingTop: safeTop(insets.top, spacing.lg),
                paddingBottom: safeBottom(insets.bottom, spacing.lg),
              },
              panelStyle,
            ]}
          >
            <ScrollView contentContainerStyle={{ gap: spacing.xs }}>
              <PressableScale
                onPress={() => go('/me')}
                accessibilityRole="button"
                accessibilityLabel="Ver perfil"
                style={styles.profile}
              >
                <Artwork
                  uri={imageUrl('avatars', profile?.avatar_path)}
                  size={56}
                  rounded
                  icon="person"
                  seed={profile?.id}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {profile?.display_name || profile?.username}
                  </Text>
                  <Text variant="caption" muted>
                    Ver perfil
                  </Text>
                </View>
              </PressableScale>
              <PressableScale
                onPress={() => go('/plus')}
                accessibilityRole="button"
                style={[styles.premium, plus.isPlus && { backgroundColor: colors.accent }]}
              >
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={plus.isPlus ? colors.onAccent : colors.accent}
                />
                <Text
                  variant="bodyStrong"
                  style={{ flex: 1, color: plus.isPlus ? colors.onAccent : colors.text }}
                >
                  {plus.isPlus ? 'Tienes Aurevix Premium' : 'Hazte Premium'}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={plus.isPlus ? colors.onAccent : colors.textMuted}
                />
              </PressableScale>
              <View style={{ height: spacing.md }} />
              {items.map((it) => (
                <PressableScale
                  key={it.label}
                  onPress={() => go(it.href)}
                  accessibilityRole="button"
                  accessibilityLabel={it.count ? `${it.label}, ${it.count} sin leer` : it.label}
                  style={styles.item}
                >
                  <Ionicons
                    name={it.icon}
                    size={24}
                    color={it.accent ? colors.accent : colors.text}
                  />
                  <Text style={styles.label}>{it.label}</Text>
                  {it.count ? (
                    <View style={styles.count}>
                      <Text style={styles.countText}>{it.count > 99 ? '99+' : it.count}</Text>
                    </View>
                  ) : null}
                </PressableScale>
              ))}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: {
    backgroundColor: '#17171B',
    paddingHorizontal: spacing.lg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  name: { fontFamily: fonts.displayHeavy, fontSize: 20, letterSpacing: -0.4, color: colors.text },
  premium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(200,245,96,0.35)',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: 13 },
  label: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.text },
  count: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: colors.onAccent },
});
