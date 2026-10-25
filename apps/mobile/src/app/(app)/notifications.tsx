import { formatRelative, type NotificationRow } from '@ordyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { getNotifications, markAllNotificationsRead } from '@/api/me';
import { formatDay } from '@/api/plus';
import { EmptyState, ErrorState, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

function describe(n: NotificationRow): { text: string; href?: string } {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case 'new_follower':
      return { text: 'Tienes un nuevo seguidor' };
    case 'new_comment':
      return { text: 'Han comentado en una de tus canciones', href: `/track/${p.track_id}` };
    case 'track_published':
      return { text: `«${p.title}» ya está publicada`, href: `/track/${p.track_id}` };
    case 'track_rejected':
      return {
        text: `«${p.title}» no se ha aprobado${p.note ? `: ${p.note}` : ''}`,
        href: '/studio',
      };
    case 'track_removed':
      return {
        text: `«${p.title}» ha sido retirada${p.note ? `: ${p.note}` : ''}`,
        href: '/studio',
      };
    case 'report_resolved':
      return { text: 'Hemos revisado tu denuncia. Gracias por ayudarnos.' };
    case 'system':
      if (p.kind === 'plus_activated')
        return {
          text: `¡Ya tienes Aurevix Plus! Hemos recibido tu Bizum (${p.reference}). Activo hasta el ${formatDay(p.expires_at)}.`,
          href: '/plus',
        };
      if (p.kind === 'plus_gift')
        return {
          text: `Te hemos regalado Aurevix Plus hasta el ${formatDay(p.expires_at)}. ¡Disfrútalo!`,
          href: '/plus',
        };
      if (p.kind === 'plus_rejected')
        return {
          text: `No hemos podido confirmar el Bizum ${p.reference}${p.note ? `: ${p.note}` : ''}.`,
          href: '/plus',
        };
      return { text: p.message ?? 'Notificación del sistema' };
    default:
      return { text: p.message ?? 'Notificación del sistema' };
  }
}

export default function Notifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const markRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  useEffect(() => {
    if (q.data?.some((n) => !n.read_at)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  return (
    <>
      <Stack.Screen options={{ title: 'Notificaciones' }} />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          style={{ backgroundColor: 'transparent' }}
          data={q.data}
          keyExtractor={(n) => n.id}
          ListEmptyComponent={
            <EmptyState icon="notifications-off-outline" title="No tienes notificaciones" />
          }
          renderItem={({ item }) => {
            const d = describe(item);
            return (
              <Pressable
                onPress={() => d.href && router.push(d.href as never)}
                style={styles.row}
                accessibilityRole={d.href ? 'link' : 'text'}
              >
                {!item.read_at ? <View style={styles.dot} /> : <View style={{ width: 8 }} />}
                <View style={{ flex: 1 }}>
                  <Text>{d.text}</Text>
                  <Text variant="caption" muted>
                    {formatRelative(item.created_at)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentStrong },
});
