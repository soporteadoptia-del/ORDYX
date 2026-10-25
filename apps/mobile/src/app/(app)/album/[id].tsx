import { formatLongDuration } from '@ordyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable } from 'react-native';
import { getAlbum } from '@/api/catalog';
import { isAlbumSaved, setAlbumSaved } from '@/api/library';
import { CollectionHeader } from '@/components/CollectionHeader';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TrackRow } from '@/components/TrackRow';
import { EmptyState, ErrorState, IconButton, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList, shufflePlay } from '@/player/play';
import { colors } from '@/theme';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['album', id], queryFn: () => getAlbum(id) });
  const saved = useQuery({ queryKey: ['album', id, 'saved'], queryFn: () => isAlbumSaved(id) });
  const toggle = useMutation({
    mutationFn: () => setAlbumSaved(id, !saved.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['album', id, 'saved'] });
      void qc.invalidateQueries({ queryKey: ['library', 'albums'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });
  if (q.isLoading) return <Loading />;
  if (!q.data) return <ErrorState message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  const a = q.data;
  const total = a.tracks.reduce((s, t) => s + (t.duration_ms ?? 0), 0);
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={a.tracks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <CollectionHeader
            image={imageUrl('covers', a.cover_path)}
            seed={a.id}
            icon="disc"
            kicker="Álbum"
            title={a.title}
            description={a.description}
            subtitle={
              <Pressable
                onPress={() => a.artist && router.push(`/artist/${a.artist.id}`)}
                accessibilityRole="link"
              >
                <Text muted>
                  {a.artist?.name ?? ''}
                  {a.release_date ? ` · ${a.release_date.slice(0, 4)}` : ''} · {a.tracks.length}{' '}
                  canciones · {formatLongDuration(total)}
                </Text>
              </Pressable>
            }
            playDisabled={a.tracks.length === 0}
            onPlay={() => void playList(a.tracks, 0, { type: 'album', id: a.id })}
            onShuffle={() => void shufflePlay(a.tracks, { type: 'album', id: a.id })}
            actions={
              <IconButton
                name={saved.data ? 'checkmark-circle' : 'add-circle-outline'}
                color={saved.data ? colors.accentStrong : colors.text}
                label={saved.data ? 'Quitar de tu biblioteca' : 'Guardar álbum'}
                onPress={() => toggle.mutate()}
              />
            }
          />
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            showArtwork={false}
            onPress={() => void playList(a.tracks, index, { type: 'album', id: a.id })}
          />
        )}
        ListEmptyComponent={<EmptyState title="Este álbum todavía no tiene canciones" />}
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
      />
    </>
  );
}
