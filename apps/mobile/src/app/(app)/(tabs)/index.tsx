import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  getFeaturedArtists,
  getFeaturedPlaylists,
  getGenres,
  getIndependentTracks,
  getNewReleases,
  getPopularAlbums,
  getPopularTracks,
} from '@/api/catalog';
import { getLikedTracks, getMyPlaylists, getRecentlyPlayed } from '@/api/library';
import type { TrackListItem } from '@/api/types';
import { Artwork } from '@/components/Artwork';
import { GenreGrid } from '@/components/GenreGrid';
import { Logo } from '@/components/Logo';
import { Carousel, type CardItem } from '@/components/MediaCard';
import { LIST_BOTTOM_PADDING, Screen } from '@/components/Screen';
import { Badge, ErrorState, IconButton, Loading, SectionHeader, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

function greeting() {
  const h = new Date().getHours();
  return h < 6
    ? 'Buenas noches'
    : h < 13
      ? 'Buenos días'
      : h < 21
        ? 'Buenas tardes'
        : 'Buenas noches';
}

const trackCards = (
  tracks: TrackListItem[] | undefined,
  ctx: Parameters<typeof playList>[2],
): CardItem[] =>
  (tracks ?? []).map((t, i) => ({
    id: t.id,
    title: t.title,
    subtitle: t.artist?.name,
    imageUrl: imageUrl('covers', t.cover_path) ?? imageUrl('covers', t.artist?.image_path),
    onPress: () => void playList(tracks!, i, ctx),
  }));

export default function Home() {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const recent = useQuery({ queryKey: ['home', 'recent'], queryFn: () => getRecentlyPlayed(12) });
  const popular = useQuery({ queryKey: ['home', 'popular'], queryFn: () => getPopularTracks(12) });
  const fresh = useQuery({ queryKey: ['home', 'new'], queryFn: () => getNewReleases(12) });
  const artists = useQuery({
    queryKey: ['home', 'artists'],
    queryFn: () => getFeaturedArtists(12),
  });
  const albums = useQuery({ queryKey: ['home', 'albums'], queryFn: () => getPopularAlbums(12) });
  const playlists = useQuery({
    queryKey: ['home', 'playlists'],
    queryFn: () => getFeaturedPlaylists(12),
  });
  const indie = useQuery({ queryKey: ['home', 'indie'], queryFn: () => getIndependentTracks(12) });
  const liked = useQuery({ queryKey: ['library', 'liked', 0], queryFn: () => getLikedTracks(0) });
  const mine = useQuery({ queryKey: ['library', 'myPlaylists'], queryFn: getMyPlaylists });
  const genres = useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: 3_600_000 });

  const all = [recent, popular, fresh, artists, albums, playlists, indie, liked, mine];
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all(all.map((q) => q.refetch()));
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = popular.isLoading && fresh.isLoading;
  const fatal = popular.error && fresh.error;
  const catalogEmpty = !loading && !fatal && (popular.data?.length ?? 0) === 0;
  const hasDemo = [...(popular.data ?? []), ...(fresh.data ?? [])].some((t) => t.is_demo);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <View style={styles.header}>
          <Logo size={30} />
          <View style={{ flex: 1 }} />
          <IconButton
            name="notifications-outline"
            label="Notificaciones"
            onPress={() => router.push('/notifications')}
          />
          <IconButton
            name="settings-outline"
            label="Ajustes"
            onPress={() => router.push('/settings')}
          />
        </View>
        <View style={styles.hello}>
          <Text variant="micro" muted>
            {new Date()
              .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
              .toUpperCase()}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {greeting()}
            {profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}
          </Text>
        </View>

        {/* Tarjeta destacada en lima, como los bloques de aurevixweb.es */}
        <Pressable
          onPress={() => router.push('/search')}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel="Descubrir música"
        >
          <LinearGradient
            colors={['#C8F560', '#A9E040']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroWave} pointerEvents="none">
            {[30, 55, 80, 45, 95, 65, 35, 75, 50, 90, 40, 70, 25, 60].map((h, i) => (
              <View key={i} style={[styles.heroBar, { height: `${h}%` }]} />
            ))}
          </View>
          <Text variant="micro" style={{ color: colors.onAccent, opacity: 0.7 }}>
            DESCUBRE
          </Text>
          <Text style={styles.heroTitle}>Artistas que aún no conoces</Text>
          <View style={styles.heroCta}>
            <Ionicons name="search" size={16} color={colors.text} />
            <Text variant="bodyStrong" style={{ color: colors.text, fontSize: 14 }}>
              Explorar
            </Text>
          </View>
        </Pressable>

        {hasDemo ? (
          <View style={styles.demo}>
            <Badge label="Demo" tone="warning" />
            <Text variant="caption" muted style={{ flex: 1 }}>
              Parte del catálogo es contenido de demostración generado para pruebas, no música real
              de artistas.
            </Text>
          </View>
        ) : null}

        {/* Accesos rápidos: favoritos y playlists propias */}
        <View style={styles.quickGrid}>
          <QuickTile title="Tus favoritos" icon="heart" onPress={() => router.push('/liked')} />
          {(mine.data ?? []).slice(0, 5).map((p) => (
            <QuickTile
              key={p.id}
              title={p.title}
              image={imageUrl('playlist-images', p.cover_path)}
              seed={p.id}
              onPress={() => router.push(`/playlist/${p.id}`)}
            />
          ))}
        </View>

        {loading ? <Loading /> : null}
        {fatal ? <ErrorState message={toUserMessage(popular.error)} onRetry={onRefresh} /> : null}
        {catalogEmpty ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="musical-notes" size={22} color={colors.onAccent} />
            </View>
            <Text variant="heading">Aún no hay canciones publicadas</Text>
            <Text muted variant="caption">
              Las primeras llegarán muy pronto. ¿Haces música? Publícala desde tu perfil, en el
              estudio de artista.
            </Text>
          </View>
        ) : null}

        {(genres.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader
              title="Explora por género"
              action="Ver todos"
              onAction={() => router.push('/search')}
            />
            <GenreGrid genres={genres.data!} limit={6} />
          </>
        ) : null}

        {(recent.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader
              title="Escuchado recientemente"
              action="Historial"
              onAction={() => router.push('/history')}
            />
            <Carousel items={trackCards(recent.data, { type: 'home' })} size={132} />
          </>
        ) : null}
        {(popular.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Populares ahora" />
            <Carousel items={trackCards(popular.data, { type: 'home' })} />
          </>
        ) : null}
        {(fresh.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Nuevos lanzamientos" />
            <Carousel items={trackCards(fresh.data, { type: 'home' })} />
          </>
        ) : null}
        {(artists.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Artistas destacados" />
            <Carousel
              items={artists.data!.map((a) => ({
                id: a.id,
                title: a.name,
                subtitle: a.is_verified ? 'Artista verificado' : 'Artista',
                imageUrl: imageUrl('covers', a.image_path),
                round: true,
                icon: 'person',
                onPress: () => router.push(`/artist/${a.id}`),
              }))}
              size={124}
            />
          </>
        ) : null}
        {(albums.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Álbumes populares" />
            <Carousel
              items={albums.data!.map((a) => ({
                id: a.id,
                title: a.title,
                subtitle: a.artist?.name,
                imageUrl: imageUrl('covers', a.cover_path),
                icon: 'disc',
                onPress: () => router.push(`/album/${a.id}`),
              }))}
            />
          </>
        ) : null}
        {(playlists.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Playlists recomendadas" />
            <Carousel
              items={playlists.data!.map((p) => ({
                id: p.id,
                title: p.title,
                subtitle: `de @${p.owner?.username ?? 'usuario'}`,
                imageUrl: imageUrl('playlist-images', p.cover_path),
                icon: 'list',
                onPress: () => router.push(`/playlist/${p.id}`),
              }))}
            />
          </>
        ) : null}
        {(indie.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader title="Música independiente" />
            <Carousel items={trackCards(indie.data, { type: 'home' })} />
          </>
        ) : null}
        {(liked.data?.length ?? 0) > 0 ? (
          <>
            <SectionHeader
              title="Tus canciones favoritas"
              action="Ver todas"
              onAction={() => router.push('/liked')}
            />
            <Carousel items={trackCards(liked.data, { type: 'library' })} size={132} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function QuickTile({
  title,
  image,
  icon,
  seed,
  onPress,
}: {
  title: string;
  image?: string | null;
  icon?: 'heart';
  seed?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
    >
      {icon ? (
        <View style={[styles.tileArt, { backgroundColor: colors.accent }]}>
          <Ionicons name={icon} size={22} color={colors.onAccent} />
        </View>
      ) : (
        <Artwork
          uri={image ?? null}
          size={52}
          seed={seed}
          icon="list"
          style={{ borderRadius: 0 }}
        />
      )}
      <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1, fontSize: 13 }}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  hello: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.xs },
  hero: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    gap: spacing.sm,
    minHeight: 168,
    justifyContent: 'flex-end',
  },
  heroWave: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 120,
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    opacity: 0.25,
  },
  heroBar: { flex: 1, borderRadius: 3, backgroundColor: '#0C0C0E' },
  heroTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: '#0C0C0E',
    maxWidth: 260,
  },
  heroCta: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0C0C0E',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    marginBottom: spacing.xs,
  },
  demo: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  tile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    paddingRight: spacing.sm,
  },
  tileArt: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
