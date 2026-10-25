import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import {
  AUDIUS_GENRES,
  audiusToPlayable,
  getTrendingNow,
  type AudiusGenre,
  type AudiusTrack,
} from '@/api/audius';
import { usePlayer, useCurrentTrack } from '@/player/store';
import { colors, fonts, radius, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { NowPlayingBars, PressableScale, Skeleton } from './motion';
import { Chip, Text } from './ui';

const CARD = 168;

/**
 * «Suena esta semana»: lo más escuchado de la semana en Audius, la red abierta de artistas
 * independientes, con filtro por género. Música actual y legal, citando siempre de dónde viene.
 */
export function NowTrending() {
  const [genre, setGenre] = useState<AudiusGenre>(null);
  const q = useQuery({
    queryKey: ['audius', 'trending', genre],
    queryFn: () => getTrendingNow(genre, 20),
    staleTime: 10 * 60_000,
  });
  const current = useCurrentTrack();
  const status = usePlayer((s) => s.status);

  // Si Audius no responde, la sección desaparece sin romper el inicio.
  if (q.error && !q.data) return null;

  const play = (list: AudiusTrack[], i: number) =>
    void usePlayer.getState().playTracks(list.map(audiusToPlayable), i, { type: 'home' });

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header">
          Suena esta semana
        </Text>
        <Text variant="caption" muted>
          Lo más escuchado por artistas independientes en Audius
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {AUDIUS_GENRES.map((g) => (
          <Chip
            key={g.label}
            label={g.label}
            selected={genre === g.key}
            onPress={() => setGenre(g.key)}
          />
        ))}
      </ScrollView>
      {q.isLoading ? (
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ width: CARD, height: CARD, borderRadius: radius.md }} />
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={q.data ?? []}
          keyExtractor={(t) => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          initialNumToRender={4}
          ListEmptyComponent={
            <Text muted style={{ paddingVertical: spacing.lg }}>
              No hay canciones de este género esta semana.
            </Text>
          }
          renderItem={({ item, index }) => {
            const isCurrent = current?.id === `audius:${item.id}`;
            return (
              <PressableScale
                onPress={() => play(q.data!, index)}
                scaleTo={0.96}
                accessibilityRole="button"
                accessibilityLabel={`Número ${index + 1}: ${item.title}, de ${item.artist}`}
                style={{ width: CARD }}
              >
                <View>
                  <Artwork uri={item.artwork} size={CARD} seed={item.id} />
                  <Text style={styles.rank}>{index + 1}</Text>
                  {isCurrent ? (
                    <View style={styles.playing}>
                      <NowPlayingBars playing={status === 'playing'} color={colors.onAccent} />
                    </View>
                  ) : null}
                </View>
                <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.sm }}>
                  {item.title}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {item.artist}
                  {item.genre ? ` · ${item.genre}` : ''}
                </Text>
              </PressableScale>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  head: { paddingHorizontal: spacing.lg, gap: 2, marginBottom: spacing.md },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row' },
  rank: {
    position: 'absolute',
    left: 8,
    bottom: 2,
    fontFamily: fonts.displayHeavy,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -2,
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 12,
  },
  playing: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
