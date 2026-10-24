import { formatLongDuration } from '@ordyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Share, View } from 'react-native';
import { deletePlaylist, getPlaylist, isPlaylistSaved, movePlaylistItem, removePlaylistItem, setPlaylistSaved } from '@/api/playlists';
import { CollectionHeader } from '@/components/CollectionHeader';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TrackRow } from '@/components/TrackRow';
import { Badge, Button, EmptyState, ErrorState, IconButton, Loading, Text } from '@/components/ui';
import { env } from '@/lib/env';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList, shufflePlay } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['playlist', id], queryFn: () => getPlaylist(id) });
  const isOwner = q.data?.owner_id === session?.user.id;
  const saved = useQuery({ queryKey: ['playlist', id, 'saved'], queryFn: () => isPlaylistSaved(id), enabled: !!q.data && !isOwner });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['playlist', id] });
    void qc.invalidateQueries({ queryKey: ['library'] });
  };
  const onError = (e: unknown) => toast.show(toUserMessage(e), 'error');
  const remove = useMutation({ mutationFn: removePlaylistItem, onSuccess: invalidate, onError });
  const moveItem = useMutation({ mutationFn: ({ item, to }: { item: number; to: number }) => movePlaylistItem(item, to), onSuccess: invalidate, onError });
  const toggleSave = useMutation({
    mutationFn: () => setPlaylistSaved(id, !saved.data),
    onSuccess: () => {
      toast.show(saved.data ? 'Eliminada de tu biblioteca' : 'Guardada en tu biblioteca', 'success');
      invalidate();
    },
    onError,
  });
  const del = useMutation({
    mutationFn: () => deletePlaylist(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library'] });
      router.back();
    },
    onError,
  });

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  const p = q.data;
  const tracks = p.items.map((i) => i.track);

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={p.items}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={
          <CollectionHeader
            image={imageUrl('playlist-images', p.cover_path)}
            seed={p.id}
            icon="list"
            kicker={p.is_public ? 'Playlist pública' : 'Playlist privada'}
            title={p.title}
            description={p.description}
            subtitle={`@${p.owner?.username ?? 'usuario'} · ${p.items.length} canciones · ${formatLongDuration(p.duration_ms)}`}
            playDisabled={tracks.length === 0}
            onPlay={() => void playList(tracks, 0, { type: 'playlist', id: p.id })}
            onShuffle={() => void shufflePlay(tracks, { type: 'playlist', id: p.id })}
            actions={
              <>
                {isOwner ? (
                  <>
                    <IconButton name="create-outline" label="Editar playlist" onPress={() => router.push(`/playlist/edit/${p.id}`)} />
                    <IconButton
                      name="trash-outline"
                      label="Eliminar playlist"
                      onPress={() =>
                        Alert.alert('Eliminar playlist', `¿Seguro que quieres eliminar «${p.title}»?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => del.mutate() },
                        ])
                      }
                    />
                  </>
                ) : (
                  <IconButton
                    name={saved.data ? 'checkmark-circle' : 'add-circle-outline'}
                    color={saved.data ? colors.accentStrong : colors.text}
                    label={saved.data ? 'Quitar de tu biblioteca' : 'Guardar en tu biblioteca'}
                    onPress={() => toggleSave.mutate()}
                  />
                )}
                {p.is_public ? (
                  <IconButton name="share-outline" label="Compartir" onPress={() => void Share.share({ message: `${p.title} — ${env.webUrl}/p/${p.id}` })} />
                ) : null}
              </>
            }
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title="Esta playlist está vacía"
            message={isOwner ? 'Mantén pulsada cualquier canción y elige «Añadir a una playlist».' : undefined}
            action={isOwner ? <Button label="Buscar canciones" compact variant="secondary" onPress={() => router.push('/search')} /> : undefined}
          />
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item.track}
            onPress={() => void playList(tracks, index, { type: 'playlist', id: p.id })}
            trailing={
              isOwner ? (
                <View style={{ flexDirection: 'row' }}>
                  <IconButton name="chevron-up" label="Subir" size={18} disabled={index === 0} onPress={() => moveItem.mutate({ item: item.id, to: index })} />
                  <IconButton name="chevron-down" label="Bajar" size={18} disabled={index === p.items.length - 1} onPress={() => moveItem.mutate({ item: item.id, to: index + 2 })} />
                  <IconButton name="remove-circle-outline" label="Quitar de la playlist" size={18} color={colors.textMuted} onPress={() => remove.mutate(item.id)} />
                </View>
              ) : undefined
            }
          />
        )}
        ListFooterComponent={
          tracks.some((t) => t.is_demo) ? (
            <View style={{ padding: spacing.lg }}>
              <Badge label="Incluye contenido de demostración" tone="warning" />
            </View>
          ) : (
            <Text muted variant="caption" style={{ padding: spacing.lg }}>
              {moveItem.isPending ? 'Guardando orden…' : ''}
            </Text>
          )
        }
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
      />
    </>
  );
}
