import { formatCount } from '@ordyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { FlatList, View } from 'react-native';
import { getArtist, getArtistAlbums, getArtistTracks } from '@/api/catalog';
import { isFollowingArtist, setFollowingArtist } from '@/api/library';
import { CollectionHeader } from '@/components/CollectionHeader';
import { Carousel } from '@/components/MediaCard';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TrackRow } from '@/components/TrackRow';
import { Badge, Button, EmptyState, ErrorState, IconButton, Loading, SectionHeader } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList, shufflePlay } from '@/player/play';
import { colors, spacing } from '@/theme';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const artist = useQuery({ queryKey: ['artist', id], queryFn: () => getArtist(id) });
  const tracks = useQuery({ queryKey: ['artist', id, 'tracks'], queryFn: () => getArtistTracks(id) });
  const albums = useQuery({ queryKey: ['artist', id, 'albums'], queryFn: () => getArtistAlbums(id) });
  const following = useQuery({ queryKey: ['artist', id, 'following'], queryFn: () => isFollowingArtist(id) });
  const follow = useMutation({
    mutationFn: () => setFollowingArtist(id, !following.data),
    onMutate: () => qc.setQueryData(['artist', id, 'following'], !following.data),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['artist', id] });
      void qc.invalidateQueries({ queryKey: ['library', 'artists'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  if (artist.isLoading) return <Loading />;
  if (!artist.data) return <ErrorState message={toUserMessage(artist.error)} onRetry={() => artist.refetch()} />;
  const a = artist.data;
  const list = tracks.data ?? [];
  const links = Object.entries(a.links ?? {}).filter(([, url]) => /^https:\/\//.test(url));

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={list.slice(0, 10)}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <>
            <CollectionHeader
              image={imageUrl('covers', a.image_path)}
              seed={a.id}
              round
              icon="person"
              kicker={a.is_verified ? 'Artista verificado' : 'Artista'}
              title={a.name}
              subtitle={`${formatCount(a.follower_count)} seguidores`}
              description={a.bio}
              playDisabled={list.length === 0}
              onPlay={() => void playList(list, 0, { type: 'artist', id: a.id })}
              onShuffle={() => void shufflePlay(list, { type: 'artist', id: a.id })}
              actions={
                <>
                  <Button
                    label={following.data ? 'Siguiendo' : 'Seguir'}
                    variant="secondary"
                    compact
                    onPress={() => follow.mutate()}
                    accessibilityState={{ selected: !!following.data }}
                  />
                  <IconButton name="flag-outline" label="Denunciar artista" color={colors.textMuted} onPress={() => router.push({ pathname: '/report', params: { type: 'artist', id: a.id, label: a.name } })} />
                </>
              }
            />
            {links.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
                {links.map(([name, url]) => (
                  <Button key={name} label={name} icon="open-outline" variant="ghost" compact onPress={() => WebBrowser.openBrowserAsync(url)} />
                ))}
              </View>
            ) : null}
            <SectionHeader title="Populares" />
          </>
        }
        renderItem={({ item, index }) => <TrackRow track={item} index={index} onPress={() => void playList(list, index, { type: 'artist', id: a.id })} />}
        ListEmptyComponent={tracks.isLoading ? <Loading /> : <EmptyState title="Este artista aún no ha publicado canciones" />}
        ListFooterComponent={
          (albums.data?.length ?? 0) > 0 ? (
            <>
              <SectionHeader title="Álbumes" />
              <Carousel
                items={albums.data!.map((al) => ({
                  id: al.id,
                  title: al.title,
                  subtitle: al.release_date?.slice(0, 4) ?? 'Álbum',
                  imageUrl: imageUrl('covers', al.cover_path),
                  icon: 'disc',
                  onPress: () => router.push(`/album/${al.id}`),
                }))}
              />
              {list.some((t) => t.is_demo) ? (
                <View style={{ padding: spacing.lg }}>
                  <Badge label="Artista de demostración" tone="warning" />
                </View>
              ) : null}
            </>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
      />
    </>
  );
}
