import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { PlusStrip } from '@/components/PlusStrip';
import { GenreGrid } from '@/components/GenreGrid';
import { Greeting, MadeForYou, NoticeBanner, RadioRow } from '@/components/HomeExtras';
import { NowTrending } from '@/components/NowTrending';
import { SideMenu } from '@/components/SideMenu';
import { PressableScale, Skeleton } from '@/components/motion';
import { Carousel, type CardItem } from '@/components/MediaCard';
import { LIST_BOTTOM_PADDING, Screen } from '@/components/Screen';
import { Badge, Chip, ErrorState, SectionHeader, Text } from '@/components/ui';
import { formatEuros } from '@/api/plus';
import { usePlus, usePlusOffer } from '@/hooks/usePlus';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

type Filter = 'all' | 'music' | 'playlists' | 'artists';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'music', label: 'Música' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'artists', label: 'Artistas' },
];

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

interface Quick {
  id: string;
  title: string;
  image?: string | null;
  round?: boolean;
  heart?: boolean;
  onPress: () => void;
}

export default function Home() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState(false);
  const { isPlus, data: plusData } = usePlus();
  const offer = usePlusOffer();
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

  const all = [recent, popular, fresh, artists, albums, playlists, indie, liked, mine, genres];
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all(all.map((q) => q.refetch()));
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accesos rápidos (cuadrícula de 2 columnas): favoritos, tus playlists, lo último que has
  // escuchado y lo destacado, sin repetir y hasta 8.
  const quick = useMemo<Quick[]>(() => {
    const items: Quick[] = [
      { id: 'liked', title: 'Tus favoritos', heart: true, onPress: () => router.push('/liked') },
    ];
    const seen = new Set<string>();
    const add = (q: Quick) => {
      if (items.length < 8 && !seen.has(q.id)) {
        seen.add(q.id);
        items.push(q);
      }
    };
    for (const p of [...(mine.data ?? []), ...(playlists.data ?? [])])
      add({
        id: `p-${p.id}`,
        title: p.title,
        image: imageUrl('playlist-images', p.cover_path),
        onPress: () => router.push(`/playlist/${p.id}`),
      });
    for (const a of artists.data ?? [])
      add({
        id: `a-${a.id}`,
        title: a.name,
        image: imageUrl('covers', a.image_path),
        round: true,
        onPress: () => router.push(`/artist/${a.id}`),
      });
    const tracks = [...(recent.data ?? []), ...(popular.data ?? [])];
    tracks.forEach((t, i) =>
      add({
        id: `t-${t.id}`,
        title: t.title,
        image: imageUrl('covers', t.cover_path) ?? imageUrl('covers', t.artist?.image_path),
        onPress: () => void playList(tracks, i, { type: 'home' }),
      }),
    );
    return items;
  }, [mine.data, playlists.data, artists.data, recent.data, popular.data]);

  const loading = popular.isLoading && fresh.isLoading;
  const fatal = popular.error && fresh.error;
  const catalogEmpty = !loading && !fatal && (popular.data?.length ?? 0) === 0;
  const hasDemo = [...(popular.data ?? []), ...(fresh.data ?? [])].some((t) => t.is_demo);
  const show = (...f: Filter[]) => filter === 'all' || f.includes(filter);
  const has = (q: { data?: unknown[] }) => (q.data?.length ?? 0) > 0;

  const playlistCards = (list: typeof playlists.data): CardItem[] =>
    (list ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.description || `de @${p.owner?.username ?? 'usuario'}`,
      imageUrl: imageUrl('playlist-images', p.cover_path),
      icon: 'list',
      onPress: () => router.push(`/playlist/${p.id}`),
    }));

  return (
    <Screen>
      <SideMenu visible={menu} onClose={() => setMenu(false)} />
      {/* Cabecera fija: avatar (abre el menú) y filtros */}
      <View style={styles.top}>
        <Pressable
          onPress={() => setMenu(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir menú de tu cuenta"
          hitSlop={6}
        >
          {profile?.avatar_path ? (
            <Artwork uri={imageUrl('avatars', profile.avatar_path)} size={36} rounded />
          ) : (
            <View style={styles.initial}>
              <Text style={styles.initialText}>
                {(profile?.display_name ?? profile?.username ?? 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {filter === 'all' ? (
          <>
            <Greeting name={profile?.display_name?.split(' ')[0] ?? null} />
            <NoticeBanner />
          </>
        ) : null}
        {filter === 'all' && !loading ? (
          <View style={styles.quickGrid}>
            {quick.map((q) => (
              <QuickTile key={q.id} item={q} />
            ))}
          </View>
        ) : null}

        {show('music') ? <NowTrending /> : null}
        {show('music') ? <MadeForYou /> : null}
        {show('music') ? <RadioRow /> : null}

        {filter === 'all' && plusData && !isPlus && !plusData.pending_id ? (
          <PlusStrip price={formatEuros(offer.data?.priceCents ?? 499)} />
        ) : null}

        {hasDemo && filter === 'all' ? (
          <View style={styles.demo}>
            <Badge label="Demo" tone="warning" />
            <Text variant="caption" muted style={{ flex: 1 }}>
              Parte del catálogo es contenido de demostración sintetizado, no música real de
              artistas.
            </Text>
          </View>
        ) : null}

        {loading ? <HomeSkeleton /> : null}
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

        {show('music') && has(recent) ? (
          <>
            <SectionHeader
              title="Escuchado recientemente"
              action="Historial"
              onAction={() => router.push('/history')}
            />
            <Carousel items={trackCards(recent.data, { type: 'home' })} size={136} />
          </>
        ) : null}
        {show('playlists') && has(playlists) ? (
          <>
            <SectionHeader title="Playlists para ti" />
            <Carousel items={playlistCards(playlists.data)} />
          </>
        ) : null}
        {show('music') && has(popular) ? (
          <>
            <SectionHeader title="Lo más escuchado" />
            <Carousel items={trackCards(popular.data, { type: 'home' })} />
          </>
        ) : null}
        {show('music') && has(fresh) ? (
          <>
            <SectionHeader title="Nuevos lanzamientos" />
            <Carousel items={trackCards(fresh.data, { type: 'home' })} />
          </>
        ) : null}
        {show('artists') && has(artists) ? (
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
              size={136}
            />
          </>
        ) : null}
        {show('artists', 'music') && has(albums) ? (
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
        {show('playlists') && has(mine) ? (
          <>
            <SectionHeader
              title="Tus playlists"
              action="Biblioteca"
              onAction={() => router.push('/library')}
            />
            <Carousel items={playlistCards(mine.data)} size={136} />
          </>
        ) : null}
        {show('music') && has(indie) ? (
          <>
            <SectionHeader title="Música independiente" />
            <Carousel items={trackCards(indie.data, { type: 'home' })} />
          </>
        ) : null}
        {show('music') && has(liked) ? (
          <>
            <SectionHeader
              title="Tus canciones favoritas"
              action="Ver todas"
              onAction={() => router.push('/liked')}
            />
            <Carousel items={trackCards(liked.data, { type: 'library' })} size={136} />
          </>
        ) : null}
        {filter === 'all' && has(genres) ? (
          <>
            <SectionHeader
              title="Explora por género"
              action="Ver todos"
              onAction={() => router.push('/search')}
            />
            <GenreGrid genres={genres.data!} limit={6} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Esqueleto con la forma del inicio: la pantalla no salta cuando llegan los datos. */
function HomeSkeleton() {
  return (
    <View accessibilityLabel="Cargando tu inicio" accessibilityRole="progressbar">
      <View style={styles.quickGrid}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} style={[styles.tile, { backgroundColor: undefined }]} />
        ))}
      </View>
      <Skeleton style={styles.skeletonTitle} />
      <View style={styles.skeletonRow}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} style={styles.skeletonCover} />
        ))}
      </View>
    </View>
  );
}

/** Acceso rápido: imagen a la izquierda a toda altura y título en dos líneas, como en Spotify. */
function QuickTile({ item }: { item: Quick }) {
  return (
    <PressableScale
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={styles.tile}
    >
      {item.heart ? (
        <View style={[styles.tileArt, styles.heart]}>
          <Ionicons name="heart" size={24} color={colors.onAccent} />
        </View>
      ) : item.round ? (
        <View style={[styles.tileArt, { alignItems: 'center', justifyContent: 'center' }]}>
          <Artwork uri={item.image ?? null} size={46} rounded icon="person" seed={item.id} />
        </View>
      ) : (
        <Artwork
          uri={item.image ?? null}
          size={TILE}
          seed={item.id}
          icon="list"
          style={{ borderRadius: 0 }}
        />
      )}
      <Text variant="bodyStrong" numberOfLines={2} style={styles.tileText}>
        {item.title}
      </Text>
    </PressableScale>
  );
}

const TILE = 56;

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  initial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: { fontFamily: fonts.displayHeavy, fontSize: 16, color: colors.onAccent },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tile: {
    width: '48.6%',
    height: TILE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingRight: spacing.sm,
  },
  tileArt: { width: TILE, height: TILE },
  heart: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { flex: 1, fontSize: 13, lineHeight: 17 },
  skeletonTitle: {
    width: 180,
    height: 24,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  skeletonRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  skeletonCover: { width: 156, height: 156, borderRadius: radius.md },
  demo: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(251,191,36,0.08)',
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
});
