import Ionicons from '@expo/vector-icons/Ionicons';
import { formatCount } from '@ordyx/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  getFollowedArtists,
  getMyPlaylists,
  getSavedAlbums,
  getSavedPlaylists,
} from '@/api/library';
import { Artwork } from '@/components/Artwork';
import { LIST_BOTTOM_PADDING, Screen } from '@/components/Screen';
import { Chip, EmptyState, ErrorState, IconButton, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { colors, spacing } from '@/theme';

type Tab = 'playlists' | 'artists' | 'albums';

export default function Library() {
  const [tab, setTab] = useState<Tab>('playlists');
  const mine = useQuery({ queryKey: ['library', 'myPlaylists'], queryFn: getMyPlaylists });
  const saved = useQuery({ queryKey: ['library', 'savedPlaylists'], queryFn: getSavedPlaylists });
  const artists = useQuery({
    queryKey: ['library', 'artists'],
    queryFn: getFollowedArtists,
    enabled: tab === 'artists',
  });
  const albums = useQuery({
    queryKey: ['library', 'albums'],
    queryFn: getSavedAlbums,
    enabled: tab === 'albums',
  });
  const active = tab === 'playlists' ? mine : tab === 'artists' ? artists : albums;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display" accessibilityRole="header" style={{ flex: 1 }}>
          Tu biblioteca
        </Text>
        <IconButton
          name="add"
          size={28}
          label="Crear playlist"
          onPress={() => router.push('/playlist/new')}
        />
      </View>
      <View style={styles.tabs}>
        <Chip
          label="Playlists"
          selected={tab === 'playlists'}
          onPress={() => setTab('playlists')}
        />
        <Chip label="Artistas" selected={tab === 'artists'} onPress={() => setTab('artists')} />
        <Chip label="Álbumes" selected={tab === 'albums'} onPress={() => setTab('albums')} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() =>
              void Promise.all([
                mine.refetch(),
                saved.refetch(),
                artists.refetch(),
                albums.refetch(),
              ])
            }
            tintColor={colors.text}
          />
        }
      >
        {tab === 'playlists' ? (
          <>
            <Row
              title="Tus favoritos"
              subtitle="Canciones que te gustan"
              art={
                <View style={[styles.gradientArt, { backgroundColor: colors.accent }]}>
                  <Ionicons name="heart" size={24} color={colors.onAccent} />
                </View>
              }
              onPress={() => router.push('/liked')}
            />
            <Row
              title="Actividad"
              subtitle="Lo nuevo de artistas y gente que sigues"
              art={
                <View style={[styles.gradientArt, { backgroundColor: colors.accentWarm }]}>
                  <Ionicons name="pulse" size={24} color={colors.onAccent} />
                </View>
              }
              onPress={() => router.push('/feed')}
            />
            <Row
              title="Listas importadas"
              subtitle="Trae tus playlists de Spotify, YouTube o SoundCloud"
              art={
                <View style={[styles.gradientArt, { backgroundColor: '#B98CFF' }]}>
                  <Ionicons name="download" size={24} color={colors.onAccent} />
                </View>
              }
              onPress={() => router.push('/import')}
            />
            <Row
              title="Historial de escucha"
              subtitle="Tus reproducciones recientes"
              art={
                <View style={[styles.gradientArt, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="time" size={24} color={colors.text} />
                </View>
              }
              onPress={() => router.push('/history')}
            />
            {[...(mine.data ?? []), ...(saved.data ?? [])].map((p) => (
              <Row
                key={p.id}
                title={p.title}
                subtitle={`Playlist · ${p.owner?.username === undefined ? '' : `@${p.owner?.username} · `}${p.track_count} canciones${p.is_public ? '' : ' · Privada'}`}
                art={
                  <Artwork
                    uri={imageUrl('playlist-images', p.cover_path)}
                    size={56}
                    icon="list"
                    seed={p.id}
                  />
                }
                onPress={() => router.push(`/playlist/${p.id}`)}
              />
            ))}
          </>
        ) : null}
        {tab === 'artists'
          ? artists.data?.map((a) => (
              <Row
                key={a.id}
                title={a.name}
                subtitle={`Artista · ${formatCount(a.follower_count)} seguidores`}
                art={
                  <Artwork
                    uri={imageUrl('covers', a.image_path)}
                    size={56}
                    rounded
                    icon="person"
                    seed={a.id}
                  />
                }
                onPress={() => router.push(`/artist/${a.id}`)}
              />
            ))
          : null}
        {tab === 'albums'
          ? albums.data?.map((a) => (
              <Row
                key={a.id}
                title={a.title}
                subtitle={`Álbum · ${a.artist?.name ?? ''}`}
                art={
                  <Artwork
                    uri={imageUrl('covers', a.cover_path)}
                    size={56}
                    icon="disc"
                    seed={a.id}
                  />
                }
                onPress={() => router.push(`/album/${a.id}`)}
              />
            ))
          : null}
        {active.isLoading ? <Loading /> : null}
        {active.error ? (
          <ErrorState message={toUserMessage(active.error)} onRetry={() => active.refetch()} />
        ) : null}
        {tab === 'artists' && artists.data?.length === 0 ? (
          <EmptyState
            icon="person-add-outline"
            title="Aún no sigues a ningún artista"
            message="Sigue a tus artistas favoritos para encontrarlos aquí."
          />
        ) : null}
        {tab === 'albums' && albums.data?.length === 0 ? (
          <EmptyState icon="disc-outline" title="No has guardado álbumes" />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Row({
  title,
  subtitle,
  art,
  onPress,
}: {
  title: string;
  subtitle: string;
  art: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      {art}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  gradientArt: {
    width: 56,
    height: 56,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
