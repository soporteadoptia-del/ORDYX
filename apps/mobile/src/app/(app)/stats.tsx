import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getListeningStats, type ListeningStats } from '@/api/plus';
import { Artwork } from '@/components/Artwork';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Loading,
  SectionHeader,
  Text,
} from '@/components/ui';
import { usePlus } from '@/hooks/usePlus';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { colors, fonts, radius, spacing } from '@/theme';

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 365, label: '12 meses' },
] as const;

export default function StatsScreen() {
  const { isPlus, isLoading } = usePlus();
  const [days, setDays] = useState<number>(30);
  const stats = useQuery({
    queryKey: ['stats', days],
    queryFn: () => getListeningStats(days),
    enabled: isPlus,
  });

  if (isLoading) return <Loading />;
  if (!isPlus)
    return (
      <EmptyState
        icon="stats-chart"
        title="Tus estadísticas son de Aurevix Premium"
        message="Descubre cuántos minutos escuchas, tus canciones y artistas del mes y a qué hora escuchas más."
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
      <Stack.Screen options={{ title: 'Tus estadísticas' }} />
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
      ) : stats.data.plays === 0 ? (
        <EmptyState
          icon="headset"
          title="Aún no hay escuchas en este periodo"
          message="Pon algo de música: las estadísticas se actualizan con cada canción que escuchas."
        />
      ) : (
        <StatsBody s={stats.data} />
      )}
    </ScrollView>
  );
}

function StatsBody({ s }: { s: ListeningStats }) {
  const maxHour = Math.max(1, ...s.by_hour.map((h) => h.minutes));
  const hours = Array.from(
    { length: 24 },
    (_, h) => s.by_hour.find((x) => x.hour === h)?.minutes ?? 0,
  );
  const peak = hours.indexOf(Math.max(...hours));
  const maxGenre = Math.max(1, ...s.top_genres.map((g) => g.minutes));

  return (
    <>
      <View style={styles.hero}>
        <Text style={styles.big}>{thousands(s.minutes)}</Text>
        <Text variant="heading" style={{ color: colors.onAccent }}>
          minutos escuchados
        </Text>
        <View style={styles.row}>
          <Figure value={thousands(s.plays)} label="reproducciones" />
          <Figure value={thousands(s.distinct_tracks)} label="canciones distintas" />
        </View>
      </View>

      {s.top_tracks.length > 0 ? (
        <>
          <SectionHeader title="Tus canciones" />
          <View style={styles.list}>
            {s.top_tracks.map((t, i) => (
              <View key={t.id} style={styles.item}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Artwork uri={imageUrl('covers', t.cover_path)} size={48} seed={t.id} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {t.artist ?? 'Artista'} · {t.plays} {t.plays === 1 ? 'vez' : 'veces'}
                  </Text>
                </View>
                <Text variant="caption" muted>
                  {t.minutes} min
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {s.top_artists.length > 0 ? (
        <>
          <SectionHeader title="Tus artistas" />
          <View style={styles.list}>
            {s.top_artists.map((a, i) => (
              <View key={a.id} style={styles.item}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Artwork
                  uri={imageUrl('covers', a.image_path)}
                  size={48}
                  rounded
                  icon="person"
                  seed={a.id}
                />
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {a.name}
                </Text>
                <Text variant="caption" muted>
                  {a.minutes} min
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {s.top_genres.length > 0 ? (
        <>
          <SectionHeader title="Tus géneros" />
          <View style={[styles.list, { gap: spacing.md }]}>
            {s.top_genres.map((g) => (
              <View key={g.id} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodyStrong">{g.name}</Text>
                  <Text variant="caption" muted>
                    {g.minutes} min
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(g.minutes / maxGenre) * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Cuándo escuchas" />
      <View style={styles.list}>
        <Text muted>
          Tu hora fuerte es de {peak}:00 a {(peak + 1) % 24}:00.
        </Text>
        <View
          style={styles.hours}
          accessible
          accessibilityLabel={`Minutos por hora del día. Máximo entre las ${peak} y las ${peak + 1}.`}
        >
          {hours.map((m, h) => (
            <View key={h} style={styles.hourCol}>
              <View
                style={[
                  styles.hourBar,
                  { height: `${Math.max(2, (m / maxHour) * 100)}%` },
                  h === peak && { backgroundColor: colors.accent },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.hourLabels}>
          {['0 h', '6 h', '12 h', '18 h', '24 h'].map((l) => (
            <Text key={l} variant="micro" muted>
              {l}
            </Text>
          ))}
        </View>
      </View>
    </>
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

/** 1284 → «1.284» (cifra exacta: aquí el número es el protagonista). */
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
  figure: { fontFamily: fonts.display, fontSize: 28, color: colors.onAccent },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 2 },
  rank: {
    width: 20,
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.accentWarm },
  hours: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 3,
    marginTop: spacing.md,
  },
  hourCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  hourBar: { borderRadius: 3, backgroundColor: 'rgba(200,245,96,0.35)' },
  hourLabels: { flexDirection: 'row', justifyContent: 'space-between' },
});
