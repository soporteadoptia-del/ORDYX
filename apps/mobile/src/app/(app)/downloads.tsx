import { formatBytes } from '@ordyx/shared';
import { router, Stack } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Artwork } from '@/components/Artwork';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { Button, EmptyState, IconButton, Text } from '@/components/ui';
import { usePlus } from '@/hooks/usePlus';
import {
  downloadsSupported,
  removeAllDownloads,
  removeDownload,
  useDownloads,
} from '@/player/downloads';
import { usePlayer } from '@/player/store';
import { colors, radius, spacing } from '@/theme';

export default function DownloadsScreen() {
  const { isPlus } = usePlus();
  const items = useDownloads((s) => s.items);
  const active = useDownloads((s) => s.active);
  const list = Object.values(items).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const total = list.reduce((n, d) => n + d.bytes, 0);
  const pending = Object.keys(active).length;

  if (!downloadsSupported)
    return (
      <EmptyState
        icon="phone-portrait-outline"
        title="Las descargas son para la app del móvil"
        message="En el navegador no se pueden guardar canciones. Instala Aurevix Music en Android para escuchar sin conexión."
      />
    );

  const play = (i: number) =>
    void usePlayer.getState().playTracks(
      list.map((d) => d.track),
      i,
      { type: 'library' },
    );

  return (
    <FlatList
      data={list}
      keyExtractor={(d) => d.track.id}
      contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Stack.Screen options={{ title: 'Descargas' }} />
          {!isPlus && list.length > 0 ? (
            <View style={styles.notice}>
              <Text variant="bodyStrong">Tus descargas están en pausa</Text>
              <Text variant="caption" muted>
                Siguen guardadas en el móvil y vuelven a sonar sin conexión en cuanto renueves Plus.
              </Text>
              <Button
                label="Renovar Plus"
                icon="sparkles"
                compact
                onPress={() => router.push('/plus')}
              />
            </View>
          ) : null}
          {list.length > 0 ? (
            <>
              <Text muted>
                {list.length} {list.length === 1 ? 'canción' : 'canciones'} · {formatBytes(total)}{' '}
                en este móvil
                {pending > 0 ? ` · descargando ${pending}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label="Reproducir" icon="play" compact onPress={() => play(0)} />
                <Button
                  label="Borrar todo"
                  icon="trash-outline"
                  variant="secondary"
                  compact
                  onPress={() =>
                    Alert.alert(
                      'Borrar descargas',
                      'Se liberará el espacio. Podrás volver a descargarlas.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Borrar', style: 'destructive', onPress: removeAllDownloads },
                      ],
                    )
                  }
                />
              </View>
            </>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="arrow-down-circle-outline"
          title={pending > 0 ? 'Descargando…' : 'Aún no has descargado nada'}
          message={
            isPlus
              ? 'En cualquier canción, abre el menú ⋯ y toca «Descargar». También desde el reproductor.'
              : 'Con Aurevix Plus puedes guardar canciones y escucharlas sin conexión.'
          }
          action={
            isPlus ? null : (
              <Button
                label="Ver Aurevix Plus"
                icon="sparkles"
                onPress={() => router.push('/plus')}
              />
            )
          }
        />
      }
      renderItem={({ item, index }) => (
        <PressableScale
          onPress={() => play(index)}
          accessibilityRole="button"
          accessibilityLabel={`${item.track.title}, ${item.track.artistName}`}
          style={styles.row}
        >
          <Artwork uri={item.track.coverUrl} size={48} seed={item.track.id} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {item.track.title}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {item.track.artistName} · {formatBytes(item.bytes)}
            </Text>
          </View>
          <IconButton
            name="close-circle-outline"
            label={`Borrar la descarga de ${item.track.title}`}
            color={colors.textMuted}
            onPress={() => removeDownload(item.track.id)}
          />
        </PressableScale>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, gap: spacing.md },
  notice: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: 'rgba(200,245,96,0.3)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
