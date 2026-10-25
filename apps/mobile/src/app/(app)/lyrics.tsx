import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLyrics } from '@/api/plus';
import { Button, EmptyState, ErrorState, IconButton, Loading, Text } from '@/components/ui';
import { usePlus } from '@/hooks/usePlus';
import { toUserMessage } from '@/lib/errors';
import { activeLine, parseLyrics } from '@/lib/lyrics';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { colors, fonts, spacing } from '@/theme';

/** Letra de la canción que suena. Sincronizada si el artista la subió en formato LRC. */
export default function LyricsScreen() {
  const insets = useSafeAreaInsets();
  const track = useCurrentTrack();
  const { isPlus, isLoading: plusLoading } = usePlus();
  const lyrics = useQuery({
    queryKey: ['lyrics', track?.id],
    queryFn: () => getLyrics(track!.id),
    enabled: !!track && isPlus,
    retry: false,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['rgba(185,140,255,0.22)', 'rgba(200,245,96,0.06)', colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <IconButton
          name="chevron-down"
          size={30}
          label="Cerrar letra"
          onPress={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {track?.title ?? 'Letra'}
          </Text>
          {track ? (
            <Text variant="caption" muted numberOfLines={1}>
              {track.artistName}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {!track ? (
        <EmptyState title="No hay nada sonando" message="Elige una canción para ver su letra." />
      ) : plusLoading ? (
        <Loading />
      ) : !isPlus ? (
        <EmptyState
          icon="text"
          title="Las letras son de Aurevix Plus"
          message="Con Plus, la letra avanza con la canción y puedes tocar una línea para saltar a ella."
          action={
            <Button label="Ver Aurevix Plus" icon="sparkles" onPress={() => router.push('/plus')} />
          }
        />
      ) : lyrics.isLoading ? (
        <Loading />
      ) : lyrics.error ? (
        <ErrorState message={toUserMessage(lyrics.error)} onRetry={() => void lyrics.refetch()} />
      ) : (
        <LyricsBody raw={lyrics.data ?? null} />
      )}
    </View>
  );
}

function LyricsBody({ raw }: { raw: string | null }) {
  const { lines, synced } = useMemo(() => parseLyrics(raw), [raw]);
  const positionMs = usePlayer((s) => s.positionMs);
  const seek = usePlayer((s) => s.seek);
  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef<number[]>([]);
  const current = synced ? activeLine(lines, positionMs + 250) : -1;

  // Mantiene la línea actual en el primer tercio de la pantalla.
  useEffect(() => {
    if (current < 0) return;
    const y = offsets.current[current];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 160), animated: true });
  }, [current]);

  if (lines.length === 0)
    return (
      <EmptyState
        icon="text"
        title="Esta canción aún no tiene letra"
        message="Cuando el artista la añada desde su estudio, aparecerá aquí."
      />
    );

  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={styles.body}
      showsVerticalScrollIndicator={false}
    >
      {!synced ? (
        <Text variant="caption" muted style={{ marginBottom: spacing.lg }}>
          Letra sin sincronizar
        </Text>
      ) : null}
      {lines.map((l, i) => {
        const state = !synced ? 'plain' : i === current ? 'now' : i < current ? 'past' : 'next';
        return (
          <Pressable
            key={i}
            disabled={!synced || l.ms === null}
            onPress={() => l.ms !== null && void seek(l.ms)}
            onLayout={(e) => (offsets.current[i] = e.nativeEvent.layout.y)}
            accessibilityRole={synced ? 'button' : undefined}
            accessibilityLabel={synced ? `Saltar a: ${l.text || 'pausa instrumental'}` : undefined}
          >
            <Text
              style={[
                styles.line,
                state === 'now' && styles.now,
                state === 'past' && styles.past,
                state === 'next' && styles.next,
                state === 'plain' && styles.plain,
              ]}
            >
              {l.text || (synced ? '♪' : ' ')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 240,
    gap: spacing.md,
  },
  line: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  now: { color: colors.text },
  past: { color: 'rgba(243,241,234,0.42)' },
  next: { color: 'rgba(243,241,234,0.28)' },
  plain: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 18, lineHeight: 27 },
});
