import { TRACK_STATUS_LABELS, type TrackStatus } from '@ordyx/shared';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getArtistStats } from '@/api/plus';
import { Artwork } from '@/components/Artwork';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Loading,
  SectionHeader,
  Text,
} from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { STATUS_TONE } from '@/lib/track-status';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 365, label: '12 meses' },
] as const;

/** Estadísticas de artista (Premium): cuánta gente escucha cada una de mis canciones. */
export default function ArtistStatsScreen() {
  const { canUpload } = useAuth();
  const [days, setDays] = useState<number>(30);
  const stats = useQuery({
    queryKey: ['plus', 'artist-stats', days],
    queryFn: () => getArtistStats(days),
    enabled: canUpload,
  });

  if (!canUpload)
    return (
      <EmptyState
        icon="bar-chart-outline"
        title="Las estadísticas de artista son de Premium"
        message="Con Aurevix Premium publicas tu música y ves sus escuchas, oyentes y favoritos."
        action={
          <Button
            label="Ver Aurevix Premium"
            icon="sparkles"
            onPress={() => router.push('/plus')}
          />
        }
      />
    );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING + spacing.xxl }}>
      <Stack.Screen options={{ title: 'Estadísticas de artista' }} />
      <View style={styles.ranges}>
        {RANGES.map((r) => (
          <Chip
            key={r.days}
            label={r.label}
            selected={days === r.days}
            onPress={() => setDays(r.days)}
          />
        ))}
      </View>
      {stats.isLoading ? (
        <Loading />
      ) : stats.error || !stats.data ? (
        <ErrorState message={toUserMessage(stats.error)} onRetry={() => void stats.refetch()} />
      ) : stats.data.tracks.length === 0 ? (
        <EmptyState
          icon="cloud-upload-outline"
          title="Aún no has subido canciones"
          message="Cuando publiques tu primera canción, aquí verás quién la escucha."
          action={
            <Button
              label="Subir una canción"
              icon="cloud-upload-outline"
              onPress={() => router.push('/studio')}
            />
          }
        />
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.big}>{thousands(stats.data.plays)}</Text>
            <Text variant="heading" style={{ color: colors.onAccent }}>
              escuchas de tu música
            </Text>
            <View style={styles.row}>
              <Figure value={thousands(stats.data.listeners)} label="oyentes" />
              <Figure value={thousands(stats.data.minutes)} label="minutos" />
              <Figure value={thousands(stats.data.likes)} label="favoritos" />
            </View>
          </View>
          <SectionHeader title="Tus canciones" />
          <View style={styles.list}>
            {stats.data.tracks.map((t) => (
              <View key={t.id} style={styles.item}>
                <Artwork uri={imageUrl('covers', t.cover_path)} size={52} seed={t.id} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {t.listeners} {t.listeners === 1 ? 'oyente' : 'oyentes'} · {t.minutes} min
                  </Text>
                  {t.status !== 'published' ? (
                    <View style={{ flexDirection: 'row' }}>
                      <Badge
                        label={TRACK_STATUS_LABELS[t.status as TrackStatus] ?? t.status}
                        tone={STATUS_TONE[t.status as TrackStatus]}
                      />
                    </View>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.plays}>{thousands(t.plays)}</Text>
                  <Text variant="micro" muted>
                    escuchas
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.figure}>{value}</Text>
      <Text variant="caption" style={{ color: colors.onAccent, opacity: 0.75 }}>
        {label}
      </Text>
    </View>
  );
}

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const styles = StyleSheet.create({
  ranges: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  hero: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  big: {
    fontFamily: fonts.displayHeavy,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -3,
    color: colors.onAccent,
  },
  row: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xl },
  figure: { fontFamily: fonts.display, fontSize: 26, color: colors.onAccent },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plays: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
});
