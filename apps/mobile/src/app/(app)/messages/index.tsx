import { formatRelative } from '@ordyx/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { getConversations, getPeopleIFollow, sendMessage } from '@/api/together';
import type { ProfileSummary } from '@/api/types';
import { Artwork } from '@/components/Artwork';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { Badge, Button, EmptyState, ErrorState, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { colors, fonts, radius, spacing } from '@/theme';

const KIND_LABEL = { track: '🎵 Canción', playlist: '📃 Lista', text: '' } as const;

/**
 * Mensajes: comparte lo que escuchas con quien sigues. Con `?trackId=` o `?playlistId=` la
 * pantalla sirve para «Enviar a…»: eliges a la persona y se envía al momento.
 */
export default function MessagesScreen() {
  const params = useLocalSearchParams<{ trackId?: string; playlistId?: string; title?: string }>();
  const sharing = !!(params.trackId || params.playlistId);
  const toast = useToast();
  const [picking, setPicking] = useState(sharing);
  const [filter, setFilter] = useState('');
  const convs = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: getConversations,
    refetchInterval: 15_000,
  });
  const people = useQuery({
    queryKey: ['messages', 'people'],
    queryFn: getPeopleIFollow,
    enabled: picking,
  });
  const share = useMutation({
    mutationFn: (p: ProfileSummary) =>
      sendMessage(p.id, { trackId: params.trackId, playlistId: params.playlistId }),
    onSuccess: (_d, p) => {
      toast.show(`Enviado a ${p.display_name || p.username}`, 'success');
      router.replace({
        pathname: '/messages/[id]',
        params: { id: p.id, name: p.display_name || p.username },
      });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  function pick(p: ProfileSummary) {
    if (sharing) share.mutate(p);
    else
      router.push({
        pathname: '/messages/[id]',
        params: { id: p.id, name: p.display_name || p.username },
      });
  }

  if (picking) {
    const f = filter.trim().toLowerCase();
    const list = (people.data ?? []).filter(
      (p) =>
        !f ||
        p.username.toLowerCase().includes(f) ||
        (p.display_name ?? '').toLowerCase().includes(f),
    );
    return (
      <>
        <Stack.Screen
          options={{ title: sharing ? `Enviar «${params.title ?? ''}»` : 'Mensaje nuevo' }}
        />
        <View style={{ padding: spacing.lg }}>
          <TextInput
            value={filter}
            onChangeText={setFilter}
            autoFocus
            placeholder="Buscar entre las personas que sigues"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="Buscar persona"
            style={styles.search}
          />
        </View>
        {people.isLoading ? <Loading /> : null}
        {people.data && list.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Sigue a alguien para escribirle"
            message="Puedes enviar mensajes a las personas que sigues."
          />
        ) : null}
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
          renderItem={({ item }) => (
            <PressableScale
              onPress={() => pick(item)}
              disabled={share.isPending}
              accessibilityRole="button"
              accessibilityLabel={`Escribir a ${item.display_name || item.username}`}
              style={styles.row}
            >
              <Artwork
                uri={imageUrl('avatars', item.avatar_path)}
                size={48}
                rounded
                icon="person"
                seed={item.id}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.display_name || item.username}
                </Text>
                <Text variant="caption" muted>
                  @{item.username}
                </Text>
              </View>
              <Ionicons
                name={sharing ? 'send' : 'chevron-forward'}
                size={18}
                color={colors.accent}
              />
            </PressableScale>
          )}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Mensajes' }} />
      <FlatList
        data={convs.data ?? []}
        keyExtractor={(c) => c.other_id}
        refreshing={convs.isRefetching}
        onRefresh={() => void convs.refetch()}
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text muted>Comparte lo que te gusta con tus amigos, directamente en Aurevix.</Text>
            <Button label="Mensaje nuevo" icon="create-outline" onPress={() => setPicking(true)} />
          </View>
        }
        ListEmptyComponent={
          convs.isLoading ? (
            <Loading />
          ) : convs.error ? (
            <ErrorState message={toUserMessage(convs.error)} onRetry={() => void convs.refetch()} />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="Aún no tienes mensajes"
              message="Envía una canción a un amigo desde su menú (⋯ → Enviar a un amigo)."
            />
          )
        }
        renderItem={({ item }) => (
          <PressableScale
            onPress={() =>
              router.push({
                pathname: '/messages/[id]',
                params: { id: item.other_id, name: item.display_name || item.username },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Conversación con ${item.display_name || item.username}`}
            style={styles.row}
          >
            <Artwork
              uri={imageUrl('avatars', item.avatar_path)}
              size={52}
              rounded
              icon="person"
              seed={item.other_id}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.display_name || item.username}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {item.last_from_me ? 'Tú: ' : ''}
                {KIND_LABEL[item.last_kind] || item.last_body} · {formatRelative(item.last_at)}
              </Text>
            </View>
            {item.unread > 0 ? <Badge label={String(item.unread)} /> : null}
          </PressableScale>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  head: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  search: {
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
