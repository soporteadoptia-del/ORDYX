import Ionicons from '@expo/vector-icons/Ionicons';
import { LIMITS, type SearchKind, type SearchResult } from '@ordyx/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { getGenres, getTracksByIds, searchCatalog } from '@/api/catalog';
import { addSearchHistory, clearSearchHistory, getSearchHistory } from '@/api/social';
import { Artwork } from '@/components/Artwork';
import { LIST_BOTTOM_PADDING, Screen } from '@/components/Screen';
import { Chip, EmptyState, ErrorState, IconButton, Loading, SectionHeader, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList } from '@/player/play';
import { colors, radius, spacing } from '@/theme';

const KINDS: { kind: SearchKind | null; label: string }[] = [
  { kind: null, label: 'Todo' },
  { kind: 'track', label: 'Canciones' },
  { kind: 'artist', label: 'Artistas' },
  { kind: 'album', label: 'Álbumes' },
  { kind: 'playlist', label: 'Playlists' },
  { kind: 'profile', label: 'Perfiles' },
];

const KIND_LABEL: Record<SearchKind, string> = { track: 'Canción', artist: 'Artista', album: 'Álbum', playlist: 'Playlist', profile: 'Perfil' };

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Search() {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<SearchKind | null>(null);
  const query = useDebounced(text.trim(), 300);
  const qc = useQueryClient();

  const results = useInfiniteQuery({
    queryKey: ['search', query, kind],
    queryFn: ({ pageParam }) => searchCatalog(query, kind, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === LIMITS.pageSize ? pages.length : undefined),
    enabled: query.length > 0,
  });
  const history = useQuery({ queryKey: ['search', 'history'], queryFn: getSearchHistory, enabled: query.length === 0 });
  const genres = useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: 3_600_000 });
  const saveHistory = useMutation({
    mutationFn: addSearchHistory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search', 'history'] }),
  });
  const clearHistory = useMutation({ mutationFn: clearSearchHistory, onSuccess: () => qc.invalidateQueries({ queryKey: ['search', 'history'] }) });

  async function open(r: SearchResult) {
    if (query) saveHistory.mutate(query);
    switch (r.kind) {
      case 'track': {
        const [track] = await getTracksByIds([r.id]);
        if (track) void playList([track], 0, { type: 'search' });
        return;
      }
      case 'artist':
        return router.push(`/artist/${r.id}`);
      case 'album':
        return router.push(`/album/${r.id}`);
      case 'playlist':
        return router.push(`/playlist/${r.id}`);
      case 'profile':
        return router.push(`/user/${(r.subtitle ?? '').replace('@', '')}`);
    }
  }

  const items = results.data?.pages.flat() ?? [];

  return (
    <Screen>
      <View style={styles.top}>
        <Text variant="display" accessibilityRole="header">
          Buscar
        </Text>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={20} color={colors.surfaceElevated} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Canciones, artistas, álbumes, playlists o perfiles"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            maxLength={LIMITS.searchQueryMax}
            onSubmitEditing={() => query && saveHistory.mutate(query)}
            accessibilityLabel="Buscar"
          />
          {text ? <IconButton name="close-circle" label="Borrar búsqueda" size={20} color={colors.textMuted} onPress={() => setText('')} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {KINDS.map((k) => (
            <Chip key={k.label} label={k.label} selected={kind === k.kind} onPress={() => setKind(k.kind)} />
          ))}
        </ScrollView>
      </View>

      {query.length === 0 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }} keyboardShouldPersistTaps="handled">
          {(history.data?.length ?? 0) > 0 ? (
            <>
              <SectionHeader title="Búsquedas recientes" action="Borrar" onAction={() => clearHistory.mutate()} />
              {history.data!.map((h) => (
                <Pressable key={h.id} onPress={() => setText(h.query)} style={styles.historyRow} accessibilityRole="button">
                  <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  <Text>{h.query}</Text>
                </Pressable>
              ))}
            </>
          ) : null}
          <SectionHeader title="Explorar géneros" />
          <View style={styles.genres}>
            {genres.data?.map((g, i) => (
              <Pressable
                key={g.id}
                onPress={() => router.push({ pathname: '/genre/[id]', params: { id: String(g.id), name: g.name } })}
                style={[styles.genre, { backgroundColor: `hsl(${(i * 47 + 260) % 360}, 55%, 32%)` }]}
                accessibilityRole="button"
              >
                <Text variant="heading">{g.name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : results.isLoading ? (
        <Loading />
      ) : results.error ? (
        <ErrorState message={toUserMessage(results.error)} onRetry={() => results.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => `${r.kind}-${r.id}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING, flexGrow: 1 }}
          onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState icon="search-outline" title={`Sin resultados para «${query}»`} message="Prueba con otras palabras o revisa la ortografía." />}
          ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator color={colors.text} style={{ margin: spacing.lg }} /> : undefined}
          renderItem={({ item }) => (
            <Pressable onPress={() => void open(item)} style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.surface }]} accessibilityRole="button">
              <Artwork
                uri={imageUrl(item.kind === 'profile' ? 'avatars' : item.kind === 'playlist' ? 'playlist-images' : 'covers', item.image_path)}
                size={52}
                rounded={item.kind === 'artist' || item.kind === 'profile'}
                icon={item.kind === 'artist' || item.kind === 'profile' ? 'person' : item.kind === 'album' ? 'disc' : item.kind === 'playlist' ? 'list' : 'musical-notes'}
                seed={item.id}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {KIND_LABEL[item.kind]}
                  {item.subtitle ? ` · ${item.subtitle}` : ''}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.background },
  historyRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  genre: { width: '48.5%', height: 88, borderRadius: radius.md, padding: spacing.md, justifyContent: 'flex-end' },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
});
