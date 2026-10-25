import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, FlatList } from 'react-native';
import { getLikedTracks } from '@/api/library';
import { CollectionHeader } from '@/components/CollectionHeader';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { TrackRow } from '@/components/TrackRow';
import { EmptyState, ErrorState, Loading } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { playList, shufflePlay } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function Liked() {
  const { profile } = useAuth();
  const q = useInfiniteQuery({
    queryKey: ['library', 'liked'],
    queryFn: ({ pageParam }) => getLikedTracks(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === 40 ? pages.length : undefined),
  });
  const tracks = q.data?.pages.flat() ?? [];
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        style={{ backgroundColor: 'transparent' }}
        data={tracks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <CollectionHeader
            image={null}
            seed="liked"
            kicker="Playlist"
            title="Tus favoritos"
            subtitle={`${profile?.display_name || profile?.username || ''} · ${tracks.length}${q.hasNextPage ? '+' : ''} canciones`}
            playDisabled={tracks.length === 0}
            onPlay={() => void playList(tracks, 0, { type: 'library' })}
            onShuffle={() => void shufflePlay(tracks, { type: 'library' })}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="Aún no tienes favoritos"
            message="Pulsa el corazón en cualquier canción para guardarla aquí."
          />
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            onPress={() => void playList(tracks, index, { type: 'library' })}
          />
        )}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        ListFooterComponent={
          q.isFetchingNextPage ? <ActivityIndicator color={colors.text} /> : undefined
        }
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
      />
    </>
  );
}
