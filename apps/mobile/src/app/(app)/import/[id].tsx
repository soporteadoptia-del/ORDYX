import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { deleteImportedList, getImportedLists, type ImportedItem } from '@/api/imports';
import { Artwork } from '@/components/Artwork';
import { unlockAudioInGesture } from '@/components/HomeExtras';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { openYouTube, YouTubeModal } from '@/components/YouTubePlayer';
import { Badge, Button, EmptyState, IconButton, Loading, Text } from '@/components/ui';
import { shuffle } from '@/player/radio';
import { usePlayer, type PlayableTrack } from '@/player/store';
import { colors, spacing } from '@/theme';

const SOURCE_LABEL: Record<ImportedItem['source'], string> = {
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  text: 'Texto',
};

export default function ImportedListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const lists = useQuery({ queryKey: ['imports'], queryFn: getImportedLists });
  const [video, setVideo] = useState<{ id: string; title: string } | null>(null);
  const list = lists.data?.find((l) => l.id === id);

  if (lists.isLoading) return <Loading />;
  if (!list)
    return (
      <EmptyState
        icon="list-outline"
        title="Esta lista ya no existe"
        message="Puede que la hayas borrado."
      />
    );

  const playable = list.items.map((i) => i.match).filter((t): t is PlayableTrack => !!t);

  function play(from: number, mix = false) {
    unlockAudioInGesture();
    const tracks = mix ? shuffle(playable) : playable;
    if (tracks.length)
      void usePlayer.getState().playTracks(tracks, mix ? 0 : from, { type: 'library' });
  }

  function remove() {
    const go = async () => {
      await deleteImportedList(list!.id);
      await qc.invalidateQueries({ queryKey: ['imports'] });
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Borrar esta lista importada?')) void go();
    } else
      Alert.alert('Borrar lista', '¿Borrar esta lista importada?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: () => void go() },
      ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: list.name,
          headerRight: () => (
            <IconButton name="trash-outline" label="Borrar lista" onPress={remove} />
          ),
        }}
      />
      <FlatList
        data={list.items}
        keyExtractor={(i, idx) => `${idx}-${i.input}`}
        contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING }}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text muted>
              {playable.length} en Aurevix o Audius ·{' '}
              {list.items.filter((i) => !i.match && i.youtubeId).length} solo en YouTube ·{' '}
              {list.items.filter((i) => !i.match && !i.youtubeId).length} sin encontrar
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Reproducir"
                  icon="play"
                  disabled={!playable.length}
                  onPress={() => play(0)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Aleatorio"
                  icon="shuffle"
                  variant="secondary"
                  disabled={!playable.length}
                  onPress={() => play(0, true)}
                />
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const idx = item.match ? playable.indexOf(item.match) : -1;
          const onPress = item.match
            ? () => play(idx)
            : item.youtubeId
              ? () => openYouTube(item.youtubeId!, (v) => setVideo({ id: v, title: item.title }))
              : undefined;
          return (
            <PressableScale
              onPress={onPress}
              disabled={!onPress}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={[styles.row, !onPress && { opacity: 0.5 }]}
            >
              <Artwork uri={item.match?.coverUrl ?? item.thumbnail} size={52} seed={item.input} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.match?.title ?? item.title}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {item.match?.artistName ?? item.artist ?? 'Artista desconocido'}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <Badge label={SOURCE_LABEL[item.source]} tone="muted" />
                  {item.match ? (
                    <Badge
                      label={item.match.externalUrl ? 'En Audius' : 'En Aurevix'}
                      tone="success"
                    />
                  ) : item.youtubeId ? (
                    <Badge label="Vídeo de YouTube" />
                  ) : (
                    <Badge label="No encontrada" tone="warning" />
                  )}
                </View>
              </View>
              {onPress ? (
                <Ionicons
                  name={item.match ? 'play-circle' : 'logo-youtube'}
                  size={28}
                  color={item.match ? colors.accent : '#FF4E45'}
                />
              ) : null}
            </PressableScale>
          );
        }}
      />
      <YouTubeModal
        videoId={video?.id ?? null}
        title={video?.title}
        onClose={() => setVideo(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  head: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
