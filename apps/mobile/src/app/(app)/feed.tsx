import { formatRelative } from '@ordyx/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { getFeed } from '@/api/feed';
import { Artwork } from '@/components/Artwork';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { TrackRow } from '@/components/TrackRow';
import { Button, EmptyState, ErrorState, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList } from '@/player/play';
import { colors, spacing } from '@/theme';

/**
 * Actividad (el «stream» de SoundCloud): lo nuevo de los artistas que sigues y lo que repostean
 * las personas que sigues, lo más reciente arriba.
 */
export default function FeedScreen() {
  const feed = useQuery({ queryKey: ['feed'], queryFn: () => getFeed(60) });
  const tracks = feed.data?.map((f) => f.track!) ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Actividad' }} />
      {feed.isLoading ? <Loading /> : null}
      {feed.error ? (
        <ErrorState message={toUserMessage(feed.error)} onRetry={() => void feed.refetch()} />
      ) : null}
      {feed.data && feed.data.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aquí verás lo nuevo de lo que sigues"
          message="Sigue a artistas y a otras personas: sus lanzamientos y reposts aparecerán aquí."
          action={
            <Button label="Buscar artistas" icon="search" onPress={() => router.push('/search')} />
          }
        />
      ) : null}
      {feed.data && feed.data.length > 0 ? (
        <FlatList
          data={feed.data}
          keyExtractor={(f) => `${f.kind}-${f.actor_id}-${f.track_id}`}
          refreshing={feed.isRefetching}
          onRefresh={() => void feed.refetch()}
          contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING, paddingTop: spacing.sm }}
          renderItem={({ item, index }) => (
            <View style={styles.item}>
              <View style={styles.who}>
                <Artwork
                  uri={imageUrl(item.kind === 'repost' ? 'avatars' : 'covers', item.actor_image)}
                  size={24}
                  rounded
                  icon="person"
                  seed={item.actor_id}
                />
                <Ionicons
                  name={item.kind === 'repost' ? 'repeat' : 'sparkles'}
                  size={14}
                  color={colors.accent}
                />
                <Text
                  variant="caption"
                  muted
                  numberOfLines={1}
                  style={{ flex: 1 }}
                  onPress={() =>
                    item.kind === 'repost' && item.actor_username
                      ? router.push(`/user/${item.actor_username}`)
                      : router.push(`/artist/${item.actor_id}`)
                  }
                >
                  <Text variant="caption" style={{ color: colors.text }}>
                    {item.actor_name}
                  </Text>
                  {item.kind === 'repost' ? ' ha reposteado' : ' ha publicado'} ·{' '}
                  {formatRelative(item.at)}
                </Text>
              </View>
              <TrackRow
                track={item.track!}
                onPress={() => void playList(tracks, index, { type: 'home' })}
              />
            </View>
          )}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  item: { paddingTop: spacing.sm },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
});
