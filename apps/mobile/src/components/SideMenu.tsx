import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNotifications } from '@/api/me';
import { getUnreadMessages } from '@/api/together';
import { usePlus } from '@/hooks/usePlus';
import { imageUrl } from '@/lib/media';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { PressableScale } from './motion';
import { Text, type IconName } from './ui';

interface Item {
  icon: IconName;
  label: string;
  href: Href;
  count?: number;
  accent?: boolean;
}

/**
 * Menú lateral (como el de Spotify al tocar tu foto): perfil, Premium y todos los accesos de la
 * cuenta en un sitio. Entra desde la izquierda en 280 ms; con «reducir movimiento», sin desplazarse.
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

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.panel,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
            !reduced && {
              animationName: {
                from: { transform: [{ translateX: -320 }] },
                to: { transform: [{ translateX: 0 }] },
              },
              animationDuration: '280ms',
              animationTimingFunction: cubicBezier(0.32, 0.72, 0, 1),
            },
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
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar menú" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: {
    width: '84%',
    maxWidth: 360,
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
