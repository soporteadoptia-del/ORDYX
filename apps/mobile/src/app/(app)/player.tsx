import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTracksByIds } from '@/api/catalog';
import { Artwork } from '@/components/Artwork';
import { SeekBar } from '@/components/SeekBar';
import { shareTrack, useTrackActions } from '@/components/TrackActions';
import { Badge, Button, EmptyState, IconButton, Text } from '@/components/ui';
import { useLikes } from '@/hooks/useLikes';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { colors, spacing } from '@/theme';

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const track = useCurrentTrack();
  const s = usePlayer();
  const { isLiked, toggle: toggleLike } = useLikes();
  const openActions = useTrackActions();

  if (!track) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState title="No hay nada sonando" message="Elige una canción para empezar." action={<Button label="Cerrar" onPress={() => router.back()} />} />
      </View>
    );
  }

  const art = Math.min(width - spacing.xl * 2, 420);
  const liked = isLiked(track.id);
  const repeatIcon = s.queue.repeat === 'one' ? 'repeat' : 'repeat';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <LinearGradient colors={['rgba(139,92,246,0.45)', 'rgba(236,72,153,0.12)', colors.background]} style={StyleSheet.absoluteFill} />
      <View style={styles.topBar}>
        <IconButton name="chevron-down" label="Minimizar reproductor" size={30} onPress={() => router.back()} />
        <Text variant="micro" muted style={{ flex: 1, textAlign: 'center' }}>
          {s.context ? `REPRODUCIENDO DESDE ${contextLabel(s.context.type)}` : 'REPRODUCIENDO'}
        </Text>
        <IconButton
          name="ellipsis-horizontal"
          label="Más opciones"
          onPress={async () => {
            const [full] = await getTracksByIds([track.id]);
            if (full) openActions(full);
          }}
        />
      </View>

      <View style={styles.artWrap}>
        <Artwork uri={track.coverUrl} size={art} seed={track.id} style={styles.artShadow} />
      </View>

      <View style={styles.meta}>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1}>
            {track.title}
          </Text>
          <Pressable onPress={() => track.artistId && (router.back(), router.push(`/artist/${track.artistId}`))} accessibilityRole="link">
            <Text muted numberOfLines={1}>
              {track.artistName}
            </Text>
          </Pressable>
          {track.isDemo ? <Badge label="Contenido de demostración" tone="warning" /> : null}
        </View>
        <IconButton
          name={liked ? 'heart' : 'heart-outline'}
          color={liked ? colors.accentWarm : colors.text}
          size={28}
          label={liked ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          onPress={() => toggleLike(track.id)}
        />
      </View>

      <View style={{ paddingHorizontal: spacing.xl }}>
        <SeekBar positionMs={s.positionMs} durationMs={s.durationMs || track.durationMs || 0} onSeek={(ms) => void s.seek(ms)} />
      </View>

      {s.status === 'error' ? (
        <Text style={styles.error} accessibilityRole="alert">
          {s.error}
        </Text>
      ) : null}

      <View style={styles.controls}>
        <IconButton
          name="shuffle"
          label={s.queue.shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
          color={s.queue.shuffle ? colors.accentStrong : colors.text}
          onPress={s.toggleShuffle}
        />
        <IconButton name="play-skip-back" size={34} label="Anterior" onPress={() => void s.previous()} />
        <Pressable
          onPress={() => void s.toggle()}
          accessibilityRole="button"
          accessibilityLabel={s.status === 'playing' ? 'Pausar' : s.status === 'error' ? 'Reintentar' : 'Reproducir'}
          style={({ pressed }) => [styles.playButton, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          {s.status === 'loading' || s.isBuffering ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Ionicons name={s.status === 'playing' ? 'pause' : s.status === 'error' ? 'refresh' : 'play'} size={36} color={colors.background} style={s.status === 'playing' ? undefined : { marginLeft: 4 }} />
          )}
        </Pressable>
        <IconButton name="play-skip-forward" size={34} label="Siguiente" onPress={() => void s.next()} />
        <View>
          <IconButton
            name={repeatIcon}
            label={s.queue.repeat === 'off' ? 'Repetir la cola' : s.queue.repeat === 'all' ? 'Repetir una canción' : 'Desactivar repetición'}
            color={s.queue.repeat === 'off' ? colors.text : colors.accentStrong}
            onPress={s.cycleRepeat}
          />
          {s.queue.repeat === 'one' ? (
            <Text variant="micro" style={styles.repeatOne}>
              1
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <IconButton name="share-outline" label="Compartir" onPress={() => void shareTrack({ id: track.id, title: track.title, artistName: track.artistName })} />
        <IconButton name="chatbubble-ellipses-outline" label="Comentarios" onPress={() => (router.back(), router.push(`/track/${track.id}`))} />
        <IconButton name="list" label="Cola de reproducción" onPress={() => router.push('/queue')} />
      </View>
    </View>
  );
}

function contextLabel(type: string) {
  return (
    { playlist: 'UNA PLAYLIST', album: 'UN ÁLBUM', artist: 'UN ARTISTA', search: 'LA BÚSQUEDA', home: 'INICIO', library: 'TU BIBLIOTECA', track: 'UNA CANCIÓN', profile: 'UN PERFIL', queue: 'LA COLA' } as Record<string, string>
  )[type] ?? 'ORDYX';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  artWrap: { alignItems: 'center', paddingHorizontal: spacing.xl },
  artShadow: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  playButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  repeatOne: { position: 'absolute', right: 0, top: 0, color: colors.accentStrong },
  error: { color: colors.danger, textAlign: 'center', paddingHorizontal: spacing.xl },
});
