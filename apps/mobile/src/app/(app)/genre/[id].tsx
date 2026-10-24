import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList } from 'react-native';
import { getTracksByGenre } from '@/api/catalog';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { TrackRow } from '@/components/TrackRow';
import { EmptyState, ErrorState, Loading } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { playList } from '@/player/play';
import { colors } from '@/theme';

export default function Genre() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const q = useInfiniteQuery({
    queryKey: ['genre', id],
    queryFn: ({ pageParam }) => getTracksByGenre(Number(id), pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === 20 ? pages.length : undefined),
  });
  const tracks = q.data?.pages.flat() ?? [];
  return (
    <>
      <Stack.Screen options={{ title: name ?? 'Género' }} />
      {q.isLoading ? <Loading /> : q.error ? (
        <ErrorState message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          style={{ backgroundColor: colors.background }}
          data={tracks}
          keyExtractor={(t) => t.id}
          renderItem={({ item, index }) => <TrackRow track={item} onPress={() => void playList(tracks, index, { type: 'search' })} />}
          ListEmptyComponent={<EmptyState title="Todavía no hay canciones en este género" />}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING, flexGrow: 1 }}
        />
      )}
    </>
  );
}
