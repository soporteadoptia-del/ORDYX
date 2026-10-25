import { formatCount } from '@ordyx/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getPublicPlaylistsOf } from '@/api/social';
import { Artwork } from '@/components/Artwork';
import { Carousel } from '@/components/MediaCard';
import { LIST_BOTTOM_PADDING, Screen } from '@/components/Screen';
import { Badge, Button, Loading, SectionHeader, Text } from '@/components/ui';
import { imageUrl } from '@/lib/media';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

export default function Me() {
  const { profile, roles, canUpload } = useAuth();
  const playlists = useQuery({
    queryKey: ['user', profile?.id, 'playlists'],
    queryFn: () => getPublicPlaylistsOf(profile!.id),
    enabled: !!profile,
  });
  if (!profile) return <Loading />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}>
        <View style={styles.header}>
          <Artwork
            uri={imageUrl('avatars', profile.avatar_path)}
            size={96}
            rounded
            icon="person"
            seed={profile.id}
          />
          <Text variant="title">{profile.display_name || profile.username}</Text>
          <Text muted>@{profile.username}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {roles.map((r) => (
              <Badge
                key={r}
                label={r === 'artist' ? 'Artista' : r === 'admin' ? 'Administración' : 'Moderación'}
              />
            ))}
          </View>
          <View style={styles.stats}>
            <Text
              onPress={() =>
                router.push({
                  pathname: '/user/[username]/follows',
                  params: { username: profile.username, kind: 'followers' },
                })
              }
            >
              <Text variant="bodyStrong">{formatCount(profile.follower_count)}</Text>{' '}
              <Text muted>seguidores</Text>
            </Text>
            <Text
              onPress={() =>
                router.push({
                  pathname: '/user/[username]/follows',
                  params: { username: profile.username, kind: 'following' },
                })
              }
            >
              <Text variant="bodyStrong">{formatCount(profile.following_count)}</Text>{' '}
              <Text muted>siguiendo</Text>
            </Text>
          </View>
          {profile.bio ? <Text style={{ textAlign: 'center' }}>{profile.bio}</Text> : null}
          <View style={styles.actions}>
            <Button
              label="Editar perfil"
              icon="create-outline"
              variant="secondary"
              compact
              onPress={() => router.push('/profile-edit')}
            />
            <Button
              label="Ajustes"
              icon="settings-outline"
              variant="secondary"
              compact
              onPress={() => router.push('/settings')}
            />
          </View>
          <Button
            label="Ver perfil público"
            variant="ghost"
            compact
            onPress={() => router.push(`/user/${profile.username}`)}
          />
        </View>

        <SectionHeader title="Estudio de artista" />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {canUpload ? (
            <Button
              label="Mis canciones y subidas"
              icon="cloud-upload-outline"
              onPress={() => router.push('/studio')}
            />
          ) : (
            <Text muted>
              Para publicar tu música necesitas una cuenta de artista. Escríbenos desde Ajustes →
              Ayuda y un administrador revisará tu solicitud.
            </Text>
          )}
        </View>

        {(playlists.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Tus playlists públicas" />
            <Carousel
              items={playlists.data!.map((p) => ({
                id: p.id,
                title: p.title,
                subtitle: `${p.track_count} canciones`,
                imageUrl: imageUrl('playlist-images', p.cover_path),
                icon: 'list',
                onPress: () => router.push(`/playlist/${p.id}`),
              }))}
              size={132}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
