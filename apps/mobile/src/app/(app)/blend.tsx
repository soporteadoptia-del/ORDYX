import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { getBlend, getMutuals } from '@/api/together';
import { Artwork } from '@/components/Artwork';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { TrackRow } from '@/components/TrackRow';
import { Button, EmptyState, ErrorState, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList, shufflePlay } from '@/player/play';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Fusión (el «Blend» de Spotify): una lista que mezcla lo que escucháis dos personas que os seguís.
 * Arriba van las canciones que os gustan a las dos.
 */
export default function BlendScreen() {
  const { with: withId, name } = useLocalSearchParams<{ with?: string; name?: string }>();
  return withId ? <BlendList userId={withId} name={name ?? ''} /> : <PickFriend />;
}

function PickFriend() {
  const mutuals = useQuery({ queryKey: ['blend', 'mutuals'], queryFn: getMutuals });
  return (
    <>
      <Stack.Screen options={{ title: 'Fusión' }} />
      <FlatList
        data={mutuals.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        ListHeaderComponent={
          <View style={styles.intro}>
            <View style={styles.circles} accessible={false}>
              <View style={[styles.circle, { backgroundColor: colors.accent }]} />
              <View style={[styles.circle, styles.circle2]} />
            </View>
            <Text style={styles.big}>Fusión</Text>
            <Text muted style={{ textAlign: 'center' }}>
              Combina tus gustos con los de un amigo en una sola lista. Elige a alguien que te siga
              y a quien sigas.
            </Text>
          </View>
        }
        ListEmptyComponent={
          mutuals.isLoading ? (
            <Loading />
          ) : mutuals.error ? (
            <ErrorState
              message={toUserMessage(mutuals.error)}
              onRetry={() => void mutuals.refetch()}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title="Aún no hay nadie con quien fusionar"
              message="Cuando alguien a quien sigues te siga también, aparecerá aquí."
              action={
                <Button
                  label="Invitar a amigos"
                  icon="share-social-outline"
                  onPress={() => router.push('/invite')}
                />
              }
            />
          )
        }
        renderItem={({ item }) => (
          <PressableScale
            onPress={() =>
              router.setParams({ with: item.id, name: item.display_name || item.username })
            }
            accessibilityRole="button"
            accessibilityLabel={`Fusión con ${item.display_name || item.username}`}
            style={styles.row}
          >
            <Artwork
              uri={imageUrl('avatars', item.avatar_path)}
              size={48}
              rounded
              icon="person"
              seed={item.id}
            />
            <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
              {item.display_name || item.username}
            </Text>
            <Ionicons name="git-merge" size={20} color={colors.accent} />
          </PressableScale>
        )}
      />
    </>
  );
}

function BlendList({ userId, name }: { userId: string; name: string }) {
  const { profile } = useAuth();
  const blend = useQuery({ queryKey: ['blend', userId], queryFn: () => getBlend(userId) });
  const tracks = blend.data?.map((b) => b.track) ?? [];
  const meName = profile?.display_name?.split(' ')[0] || 'Tú';

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        data={blend.data ?? []}
        keyExtractor={(b) => b.track.id}
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        ListHeaderComponent={
          <LinearGradient colors={['#C8F560', '#B98CFF', colors.background]} style={styles.hero}>
            <Text style={styles.heroKicker}>Fusión</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {meName} + {name}
            </Text>
            <Text style={{ color: colors.onAccent }}>
              {tracks.length} canciones · lo que os gusta a los dos va primero
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Reproducir"
                  icon="play"
                  disabled={!tracks.length}
                  onPress={() => void playList(tracks, 0, { type: 'profile', id: userId })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Aleatorio"
                  icon="shuffle"
                  variant="secondary"
                  disabled={!tracks.length}
                  onPress={() => void shufflePlay(tracks, { type: 'profile', id: userId })}
                />
              </View>
            </View>
          </LinearGradient>
        }
        ListEmptyComponent={
          blend.isLoading ? (
            <Loading />
          ) : blend.error ? (
            <ErrorState message={toUserMessage(blend.error)} onRetry={() => void blend.refetch()} />
          ) : (
            <EmptyState
              icon="musical-notes-outline"
              title="Aún no hay música que mezclar"
              message="Escuchad algo y dadle a ♥ a vuestras canciones: la Fusión se llena sola."
            />
          )
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item.track}
            onPress={() => void playList(tracks, index, { type: 'profile', id: userId })}
            trailing={
              <View
                style={[styles.dot, { backgroundColor: item.fromMe ? colors.accent : '#B98CFF' }]}
                accessibilityLabel={item.fromMe ? 'De tus gustos' : `De los gustos de ${name}`}
              />
            }
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  circles: { flexDirection: 'row', height: 96, marginBottom: spacing.sm },
  circle: { width: 96, height: 96, borderRadius: 48, opacity: 0.9 },
  circle2: { marginLeft: -36, backgroundColor: '#B98CFF' },
  big: { fontFamily: fonts.displayHeavy, fontSize: 36, letterSpacing: -1, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  hero: {
    padding: spacing.xl,
    paddingTop: spacing.xxl * 2,
    gap: spacing.xs,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroKicker: { fontFamily: fonts.bodyStrong, color: colors.onAccent },
  heroTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1.4,
    color: colors.onAccent,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
});
