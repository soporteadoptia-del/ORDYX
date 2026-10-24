import { formatRelative } from '@ordyx/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Alert, FlatList } from 'react-native';
import { clearListeningHistory, getListeningHistory } from '@/api/library';
import type { TrackListItem } from '@/api/types';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { TrackRow } from '@/components/TrackRow';
import { EmptyState, ErrorState, IconButton, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { playList } from '@/player/play';
import { colors } from '@/theme';

export default function History() {
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ['library', 'history'],
    queryFn: ({ pageParam }) => getListeningHistory(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === 40 ? pages.length : undefined),
  });
  const clear = useMutation({
    mutationFn: clearListeningHistory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library', 'history'] });
      void qc.invalidateQueries({ queryKey: ['home', 'recent'] });
    },
  });
  const rows = (q.data?.pages.flat() ?? []).filter((r) => r.track) as {
    id: number;
    played_at: string;
    track: TrackListItem;
  }[];
  const tracks = rows.map((r) => r.track);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Historial de escucha',
          headerRight: () => (
            <IconButton
              name="trash-outline"
              label="Borrar historial"
              onPress={() =>
                Alert.alert(
                  'Borrar historial',
                  'Se eliminará tu historial de escucha. Las estadísticas agregadas no se ven afectadas.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Borrar', style: 'destructive', onPress: () => clear.mutate() },
                  ],
                )
              }
            />
          ),
        }}
      />
      {q.isLoading ? <Loading /> : null}
      {q.error ? <ErrorState message={toUserMessage(q.error)} onRetry={() => q.refetch()} /> : null}
      {q.data ? (
        <FlatList
          style={{ backgroundColor: colors.background }}
          data={rows}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item, index }) => (
            <TrackRow
              track={item.track}
              onPress={() => void playList(tracks, index, { type: 'library' })}
              trailing={
                <Text variant="caption" muted>
                  {formatRelative(item.played_at)}
                </Text>
              }
            />
          )}
          ListEmptyComponent={<EmptyState icon="time-outline" title="Tu historial está vacío" />}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING, flexGrow: 1 }}
        />
      ) : null}
    </>
  );
}
