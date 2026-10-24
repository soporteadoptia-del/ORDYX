import { TRACK_STATUS_LABELS } from '@ordyx/shared';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { getMyArtists, getMyTracks } from '@/api/upload';
import { Artwork } from '@/components/Artwork';
import { Badge, Button, EmptyState, ErrorState, Loading, SectionHeader, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { STATUS_TONE } from '@/lib/track-status';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function Studio() {
  const { canUpload } = useAuth();
  const artists = useQuery({ queryKey: ['studio', 'artists'], queryFn: getMyArtists });
  const tracks = useQuery({ queryKey: ['studio', 'tracks'], queryFn: getMyTracks });

  if (!canUpload) {
    return <EmptyState icon="lock-closed-outline" title="Necesitas una cuenta de artista" message="Un administrador debe concederte permisos para publicar música." />;
  }
  if (artists.isLoading || tracks.isLoading) return <Loading />;
  if (artists.error || tracks.error) return <ErrorState message={toUserMessage(artists.error ?? tracks.error)} onRetry={() => (artists.refetch(), tracks.refetch())} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Estudio' }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={tracks.data}
        keyExtractor={(t) => t.id}
        onRefresh={() => void tracks.refetch()}
        refreshing={tracks.isRefetching}
        ListHeaderComponent={
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Text muted>Sube solo música propia o sobre la que tengas autorización. Cada canción pasa una revisión antes de publicarse.</Text>
            {(artists.data?.length ?? 0) === 0 ? (
              <Button label="Crear tu perfil de artista" icon="person-add-outline" onPress={() => router.push('/studio/artist-new')} />
            ) : (
              <>
                <Button label="Subir una canción" icon="cloud-upload-outline" onPress={() => router.push('/studio/upload')} />
                <Text variant="caption" muted>
                  Publicas como: {artists.data!.map((a) => a.name).join(', ')} ·{' '}
                  <Text variant="caption" style={{ color: colors.accentStrong }} onPress={() => router.push('/studio/artist-new')}>
                    nuevo artista
                  </Text>
                </Text>
              </>
            )}
            <SectionHeader title="Tus canciones" />
          </View>
        }
        ListEmptyComponent={<EmptyState icon="musical-note-outline" title="Aún no has subido canciones" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/studio/track/${item.id}`)} style={styles.row} accessibilityRole="button">
            <Artwork uri={imageUrl('covers', item.cover_path)} size={52} seed={item.id} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <Badge label={TRACK_STATUS_LABELS[item.status]} tone={STATUS_TONE[item.status]} />
                <Text variant="caption" muted>
                  {item.artist?.name} · {item.play_count} repr.
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: spacing.xxl * 3 }}
      />
    </>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm } });
