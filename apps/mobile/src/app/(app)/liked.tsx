import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { getLikedTracks } from '@/api/library';
import { CollectionHeader } from '@/components/CollectionHeader';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { TrackRow } from '@/components/TrackRow';
import { Chip, EmptyState, ErrorState, Loading } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { playList, shufflePlay } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

type Sort = 'recent' | 'title' | 'artist';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Recientes' },
  { key: 'title', label: 'Título' },
  { key: 'artist', label: 'Artista' },
];

export default function Liked() {
  const { profile } = useAuth();
  const q = useInfiniteQuery({
    queryKey: ['library', 'liked'],
    queryFn: ({ pageParam }) => getLikedTracks(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === 40 ? pages.length : undefined),
  });
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const all = q.data?.pages.flat() ?? [];
  const f = filter.trim().toLowerCase();
  const tracks = all
    .filter(
      (t) =>
        !f || t.title.toLowerCase().includes(f) || (t.artist?.name ?? '').toLowerCase().includes(f),
    )
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title, 'es')
        : sort === 'artist'
          ? (a.artist?.name ?? '').localeCompare(b.artist?.name ?? '', 'es')
          : 0,
    );
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
          <>
            <CollectionHeader
              image={null}
              seed="liked"
              kicker="Playlist"
              title="Tus favoritos"
              subtitle={`${profile?.display_name || profile?.username || ''} · ${all.length}${q.hasNextPage ? '+' : ''} canciones`}
              playDisabled={tracks.length === 0}
              onPlay={() => void playList(tracks, 0, { type: 'library' })}
              onShuffle={() => void shufflePlay(tracks, { type: 'library' })}
            />
            {all.length > 3 ? (
              <View style={styles.tools}>
                <TextInput
                  value={filter}
                  onChangeText={setFilter}
                  placeholder="Buscar en favoritos"
                  placeholderTextColor={colors.textSubtle}
                  accessibilityLabel="Buscar en favoritos"
                  style={styles.search}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {SORTS.map((o) => (
                    <Chip
                      key={o.key}
                      label={o.label}
                      selected={sort === o.key}
                      onPress={() => setSort(o.key)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        }

        ListEmptyComponent={
          all.length > 0 ? (
            <EmptyState
              icon="search"
              title="Nada coincide"
              message={`No hay favoritos con «${filter}».`}
            />
          ) : (
            <EmptyState
              icon="heart-outline"
              title="Aún no tienes favoritos"
              message="Pulsa el corazón en cualquier canción para guardarla aquí."
            />
          )
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

const styles = StyleSheet.create({
  tools: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  search: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
