import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import {
  deleteImportedList,
  getImportedLists,
  itemPlayable,
  retryMissing,
  type ImportedItem,
} from '@/api/imports';
import { Artwork } from '@/components/Artwork';
import { unlockAudioInGesture } from '@/components/HomeExtras';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { Badge, Button, EmptyState, IconButton, Loading, Text } from '@/components/ui';
import { embedOf } from '@/player/embed';
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
  const [busy, setBusy] = useState(false);
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

  // Todo suena dentro de Aurevix: audio de Aurevix/Audius o el reproductor oficial de YouTube/SoundCloud.
  const resolved = list.items.map(itemPlayable);
  const playable = resolved.filter((t): t is PlayableTrack => !!t);
  const missing = resolved.filter((t) => !t).length;

  function play(from: number, mix = false) {
    unlockAudioInGesture();
    const tracks = mix ? shuffle(playable) : playable;
    if (!tracks.length) return;
    void usePlayer.getState().playTracks(tracks, mix ? 0 : from, { type: 'library' });
    // YouTube y SoundCloud solo suenan con su reproductor a la vista: se abre el reproductor.
    if (embedOf(tracks[mix ? 0 : from])) router.push('/player');
  }

  async function retry() {
    setBusy(true);
    await retryMissing(list!.id);
    await qc.invalidateQueries({ queryKey: ['imports'] });
    setBusy(false);
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
              {playable.length} de {list.items.length} suenan en Aurevix
              {missing ? ` · ${missing} sin encontrar` : ''}
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
        renderItem={({ item, index }) => {
          const p = resolved[index];
          const idx = p ? playable.indexOf(p) : -1;
          const kind = embedOf(p)?.kind;
          return (
            <PressableScale
              onPress={p ? () => play(idx) : undefined}
              disabled={!p}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={[styles.row, !p && { opacity: 0.5 }]}
            >
              <Artwork uri={p?.coverUrl ?? item.thumbnail} size={52} seed={item.input} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {p?.title ?? item.title}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {p?.artistName ?? item.artist ?? 'Artista desconocido'}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <Badge label={SOURCE_LABEL[item.source]} tone="muted" />
                  {!p ? (
                    <Badge label="No encontrada" tone="warning" />
                  ) : kind ? (
                    <Badge label={kind === 'youtube' ? 'Vía YouTube' : 'Vía SoundCloud'} />
                  ) : (
                    <Badge label={p.externalUrl ? 'En Audius' : 'En Aurevix'} tone="success" />
                  )}
                </View>
              </View>
              {p ? <Ionicons name="play-circle" size={28} color={colors.accent} /> : null}
            </PressableScale>
          );
        }}
        ListFooterComponent={
          missing ? (
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text variant="caption" muted>
                Las que no encontramos se buscan también en YouTube. Si acabas de activar esa
                búsqueda, pulsa para intentarlo de nuevo.
              </Text>
              <Button
                label={busy ? 'Buscando…' : 'Buscar otra vez las que faltan'}
                icon="refresh"
                variant="secondary"
                disabled={busy}
                onPress={() => void retry()}
              />
            </View>
          ) : undefined
        }
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
