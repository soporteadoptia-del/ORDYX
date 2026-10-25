import { formatCount } from '@ordyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  getProfileByUsername,
  getPublicLikesOf,
  getPublicPlaylistsOf,
  getPublishedTracksOf,
  isBlocked,
  isFollowing,
  setBlocked,
  setFollowing,
} from '@/api/social';
import { Artwork } from '@/components/Artwork';
import { Carousel } from '@/components/MediaCard';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { TrackRow } from '@/components/TrackRow';
import { Button, ErrorState, IconButton, Loading, SectionHeader, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const profile = useQuery({
    queryKey: ['user', username],
    queryFn: () => getProfileByUsername(username),
  });
  const uid = profile.data?.id;
  const isMe = uid === session?.user.id;
  const playlists = useQuery({
    queryKey: ['user', uid, 'playlists'],
    queryFn: () => getPublicPlaylistsOf(uid!),
    enabled: !!uid,
  });
  const tracks = useQuery({
    queryKey: ['user', uid, 'tracks'],
    queryFn: () => getPublishedTracksOf(uid!),
    enabled: !!uid,
  });
  const likes = useQuery({
    queryKey: ['user', uid, 'likes'],
    queryFn: () => getPublicLikesOf(uid!),
    enabled: !!uid && !isMe,
  });
  const following = useQuery({
    queryKey: ['user', uid, 'following'],
    queryFn: () => isFollowing(uid!),
    enabled: !!uid && !isMe,
  });
  const blocked = useQuery({
    queryKey: ['user', uid, 'blocked'],
    queryFn: () => isBlocked(uid!),
    enabled: !!uid && !isMe,
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ['user'] });
  const follow = useMutation({
    mutationFn: () => setFollowing(uid!, !following.data),
    onSuccess: refresh,
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });
  const block = useMutation({
    mutationFn: () => setBlocked(uid!, !blocked.data),
    onSuccess: () => {
      toast.show(
        blocked.data
          ? 'Usuario desbloqueado'
          : 'Usuario bloqueado: no verás sus comentarios ni podrá seguirte',
        'success',
      );
      refresh();
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  if (profile.isLoading) return <Loading />;
  if (!profile.data) return <ErrorState message={toUserMessage(profile.error)} />;
  const p = profile.data;
  const trackList = tracks.data ?? [];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
    >
      <Stack.Screen options={{ title: `@${p.username}` }} />
      <View style={styles.header}>
        <Artwork
          uri={imageUrl('avatars', p.avatar_path)}
          size={104}
          rounded
          icon="person"
          seed={p.id}
        />
        <Text variant="title">{p.display_name || p.username}</Text>
        <Text muted>
          @{p.username} · en Aurevix desde{' '}
          {new Date(p.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xl }}>
          <Text
            onPress={() =>
              router.push({
                pathname: '/user/[username]/follows',
                params: { username: p.username, kind: 'followers' },
              })
            }
          >
            <Text variant="bodyStrong">{formatCount(p.follower_count)}</Text>{' '}
            <Text muted>seguidores</Text>
          </Text>
          <Text
            onPress={() =>
              router.push({
                pathname: '/user/[username]/follows',
                params: { username: p.username, kind: 'following' },
              })
            }
          >
            <Text variant="bodyStrong">{formatCount(p.following_count)}</Text>{' '}
            <Text muted>siguiendo</Text>
          </Text>
        </View>
        {p.bio ? <Text style={{ textAlign: 'center' }}>{p.bio}</Text> : null}
        {!isMe ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            {!blocked.data ? (
              <Button
                label={following.data ? 'Siguiendo' : 'Seguir'}
                variant={following.data ? 'secondary' : 'primary'}
                compact
                onPress={() => follow.mutate()}
                loading={follow.isPending}
              />
            ) : null}
            <IconButton
              name={blocked.data ? 'lock-open-outline' : 'ban-outline'}
              label={blocked.data ? 'Desbloquear usuario' : 'Bloquear usuario'}
              color={colors.textMuted}
              onPress={() =>
                Alert.alert(
                  blocked.data ? 'Desbloquear' : 'Bloquear usuario',
                  blocked.data
                    ? `¿Desbloquear a @${p.username}?`
                    : `@${p.username} no podrá seguirte ni comentar en tus canciones, y dejarás de ver sus comentarios.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: blocked.data ? 'Desbloquear' : 'Bloquear',
                      style: 'destructive',
                      onPress: () => block.mutate(),
                    },
                  ],
                )
              }
            />
            <IconButton
              name="flag-outline"
              label="Denunciar perfil"
              color={colors.textMuted}
              onPress={() =>
                router.push({
                  pathname: '/report',
                  params: { type: 'profile', id: p.id, label: `@${p.username}` },
                })
              }
            />
          </View>
        ) : null}
      </View>

      {trackList.length > 0 ? (
        <>
          <SectionHeader title="Canciones publicadas" />
          {trackList.slice(0, 10).map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              onPress={() => void playList(trackList, i, { type: 'profile', id: p.id })}
            />
          ))}
        </>
      ) : null}
      {(playlists.data?.length ?? 0) > 0 ? (
        <>
          <SectionHeader title="Playlists públicas" />
          <Carousel
            items={playlists.data!.map((pl) => ({
              id: pl.id,
              title: pl.title,
              subtitle: `${pl.track_count} canciones`,
              imageUrl: imageUrl('playlist-images', pl.cover_path),
              icon: 'list',
              onPress: () => router.push(`/playlist/${pl.id}`),
            }))}
            size={132}
          />
        </>
      ) : null}
      {(likes.data?.length ?? 0) > 0 ? (
        <>
          <SectionHeader title="Favoritos" />
          {likes.data!.slice(0, 10).map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              onPress={() => void playList(likes.data!, i, { type: 'profile', id: p.id })}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
});
