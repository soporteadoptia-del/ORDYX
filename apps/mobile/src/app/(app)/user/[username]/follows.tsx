import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { getFollowList, getProfileByUsername } from '@/api/social';
import { Artwork } from '@/components/Artwork';
import { EmptyState, Loading, Text } from '@/components/ui';
import { imageUrl } from '@/lib/media';
import { colors, spacing } from '@/theme';

export default function Follows() {
  const { username, kind } = useLocalSearchParams<{
    username: string;
    kind: 'followers' | 'following';
  }>();
  const profile = useQuery({
    queryKey: ['user', username],
    queryFn: () => getProfileByUsername(username),
  });
  const list = useInfiniteQuery({
    queryKey: ['user', profile.data?.id, kind],
    queryFn: ({ pageParam }) => getFollowList(profile.data!.id, kind, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === 40 ? pages.length : undefined),
    enabled: !!profile.data,
  });
  const items = list.data?.pages.flat() ?? [];
  return (
    <>
      <Stack.Screen options={{ title: kind === 'followers' ? 'Seguidores' : 'Siguiendo' }} />
      {list.isLoading || profile.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          style={{ backgroundColor: colors.background }}
          data={items}
          keyExtractor={(p) => p.id}
          onEndReached={() => list.hasNextPage && list.fetchNextPage()}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Nadie por aquí todavía" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/user/${item.username}`)}
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                alignItems: 'center',
                padding: spacing.md,
                paddingHorizontal: spacing.lg,
              }}
            >
              <Artwork
                uri={imageUrl('avatars', item.avatar_path)}
                size={48}
                rounded
                icon="person"
                seed={item.id}
              />
              <View>
                <Text variant="bodyStrong">{item.display_name || item.username}</Text>
                <Text variant="caption" muted>
                  @{item.username}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </>
  );
}
