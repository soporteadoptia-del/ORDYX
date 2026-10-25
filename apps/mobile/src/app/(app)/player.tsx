import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTracksByIds } from '@/api/catalog';
import { Artwork } from '@/components/Artwork';
import { SeekBar } from '@/components/SeekBar';
import { Sheet, SheetItem } from '@/components/Sheet';
import { useTrackActions } from '@/components/TrackActions';
import { PressableScale } from '@/components/motion';
import { Badge, Button, EmptyState, IconButton, Text } from '@/components/ui';
import { useDownloadToggle } from '@/hooks/useDownloadToggle';
import { useLikes } from '@/hooks/useLikes';
import { usePlus } from '@/hooks/usePlus';
import { downloadsSupported } from '@/player/downloads';
import { PLAYBACK_RATES, rateLabel, usePlayerPrefs } from '@/player/prefs';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { colors, fonts, spacing } from '@/theme';

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const track = useCurrentTrack();
  const s = usePlayer();
  const { isLiked, toggle: toggleLike } = useLikes();
  const openActions = useTrackActions();
  const downloads = useDownloadToggle();
  const { isPlus } = usePlus();
  const rate = usePlayerPrefs((p) => p.rate);
  const [sheet, setSheet] = useState<'speed' | 'sleep' | null>(null);

  if (!track) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState
          title="No hay nada sonando"
          message="Elige una canción para empezar."
          action={<Button label="Cerrar" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  const art = Math.min(width - spacing.xl * 2, 420);
  const liked = isLiked(track.id);
  const repeatIcon = s.queue.repeat === 'one' ? 'repeat' : 'repeat';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <LinearGradient
        colors={['rgba(200,245,96,0.20)', 'rgba(185,140,255,0.08)', colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topBar}>
        <IconButton
          name="chevron-down"
          label="Minimizar reproductor"
          size={30}
          onPress={() => router.back()}
        />
        <Text variant="micro" muted style={{ flex: 1, textAlign: 'center' }}>
          {s.context ? `Reproduciendo desde ${contextLabel(s.context.type)}` : 'Reproduciendo'}
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
          <Pressable
            onPress={() =>
              track.artistId && (router.back(), router.push(`/artist/${track.artistId}`))
            }
            accessibilityRole="link"
          >
            <Text muted numberOfLines={1}>
              {track.artistName}
            </Text>
          </Pressable>
          <View style={styles.badges}>
            {s.source === 'offline' ? <Badge label="Descargada" tone="success" /> : null}
            {s.source === 'original' ? <Badge label="Calidad original" /> : null}
            {track.isDemo ? <Badge label="Contenido de demostración" tone="warning" /> : null}
          </View>
        </View>
        <IconButton
          name="chatbubble-ellipses-outline"
          label="Comentarios"
          onPress={() => (router.back(), router.push(`/track/${track.id}`))}
        />
        <IconButton
          name={liked ? 'heart' : 'heart-outline'}
          color={liked ? colors.accentWarm : colors.text}
          size={28}
          label={liked ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          onPress={() => toggleLike(track.id)}
        />
      </View>

      <View style={{ paddingHorizontal: spacing.xl }}>
        <SeekBar
          positionMs={s.positionMs}
          durationMs={s.durationMs || track.durationMs || 0}
          onSeek={(ms) => void s.seek(ms)}
        />
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
        <IconButton
          name="play-skip-back"
          size={34}
          label="Anterior"
          onPress={() => void s.previous()}
        />
        <PressableScale
          onPress={() => void s.toggle()}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={
            s.status === 'playing' ? 'Pausar' : s.status === 'error' ? 'Reintentar' : 'Reproducir'
          }
          style={styles.playButton}
        >
          {s.status === 'loading' || s.isBuffering ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Ionicons
              name={s.status === 'playing' ? 'pause' : s.status === 'error' ? 'refresh' : 'play'}
              size={36}
              color={colors.onAccent}
              style={s.status === 'playing' ? undefined : { marginLeft: 4 }}
            />
          )}
        </PressableScale>
        <IconButton
          name="play-skip-forward"
          size={34}
          label="Siguiente"
          onPress={() => void s.next()}
        />
        <View>
          <IconButton
            name={repeatIcon}
            label={
              s.queue.repeat === 'off'
                ? 'Repetir la cola'
                : s.queue.repeat === 'all'
                  ? 'Repetir una canción'
                  : 'Desactivar repetición'
            }
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
        <Tool icon="text" label="Letra" onPress={() => router.push('/lyrics')} />
        <Tool
          text={rateLabel(rate)}
          label="Velocidad"
          active={rate !== 1}
          onPress={() => setSheet('speed')}
        />
        <Tool
          icon={s.sleep ? 'moon' : 'moon-outline'}
          label={s.sleep ? <SleepLeft /> : 'Dormir'}
          a11y="Temporizador para dormir"
          active={!!s.sleep}
          onPress={() => setSheet('sleep')}
        />
        {downloadsSupported ? (
          <Tool
            icon={
              downloads.isDownloaded(track.id) ? 'checkmark-circle' : 'arrow-down-circle-outline'
            }
            label={
              downloads.isDownloaded(track.id)
                ? 'Guardada'
                : downloads.isDownloading(track.id)
                  ? 'Bajando…'
                  : 'Descargar'
            }
            active={downloads.isDownloaded(track.id)}
            onPress={() => void downloads.toggle(track)}
          />
        ) : null}
        <Tool icon="list" label="Cola" onPress={() => router.push('/queue')} />
      </View>

      <Sheet visible={sheet === 'speed'} onClose={() => setSheet(null)} title="Velocidad">
        {isPlus ? (
          PLAYBACK_RATES.map((r) => (
            <SheetItem
              key={r}
              icon={
                <Ionicons
                  name={r === rate ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={r === rate ? colors.accent : colors.textMuted}
                />
              }
              label={r === 1 ? 'Normal (1×)' : rateLabel(r)}
              onPress={() => {
                usePlayerPrefs.getState().setRate(r);
                setSheet(null);
              }}
            />
          ))
        ) : (
          <View style={styles.sheetUpsell}>
            <Text muted>
              Cambiar la velocidad (de 0,75× a 2×, sin que cambie el tono de las voces) es parte de
              Aurevix Plus.
            </Text>
            <Button
              label="Ver Aurevix Plus"
              icon="sparkles"
              onPress={() => (setSheet(null), router.push('/plus'))}
            />
          </View>
        )}
      </Sheet>

      <Sheet
        visible={sheet === 'sleep'}
        onClose={() => setSheet(null)}
        title="Temporizador para dormir"
      >
        {[15, 30, 45, 60].map((m) => (
          <SheetItem
            key={m}
            icon={<Ionicons name="moon-outline" size={22} color={colors.text} />}
            label={`Dentro de ${m} minutos`}
            onPress={() => (s.setSleepTimer(m), setSheet(null))}
          />
        ))}
        <SheetItem
          icon={<Ionicons name="musical-note-outline" size={22} color={colors.text} />}
          label="Al acabar esta canción"
          onPress={() => (s.setSleepTimer('end-of-track'), setSheet(null))}
        />
        {s.sleep ? (
          <SheetItem
            icon={<Ionicons name="close-circle-outline" size={22} color={colors.danger} />}
            label="Desactivar el temporizador"
            danger
            onPress={() => (s.setSleepTimer(null), setSheet(null))}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

/** Herramienta de la fila inferior: icono (o texto corto) con su nombre debajo. */
function Tool({
  icon,
  text,
  label,
  a11y,
  active,
  onPress,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  text?: string;
  label: React.ReactNode;
  a11y?: string;
  active?: boolean;
  onPress: () => void;
}) {
  const color = active ? colors.accent : colors.text;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? (typeof label === 'string' ? label : undefined)}
      style={styles.tool}
    >
      {icon ? (
        <Ionicons name={icon} size={22} color={color} />
      ) : (
        <Text style={[styles.toolText, { color }]}>{text}</Text>
      )}
      <Text
        variant="micro"
        style={{ color: active ? colors.accent : colors.textMuted }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/** Minutos que faltan del temporizador; se actualiza cada 15 s. */
function SleepLeft() {
  const sleep = usePlayer((p) => p.sleep);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  if (sleep === 'end-of-track') return <>Al acabar</>;
  if (!sleep) return <>Dormir</>;
  return <>{Math.max(1, Math.ceil((sleep.at - now) / 60_000))} min</>;
}

function contextLabel(type: string) {
  return (
    (
      {
        playlist: 'una playlist',
        album: 'un álbum',
        artist: 'un artista',
        search: 'la búsqueda',
        home: 'Inicio',
        library: 'tu biblioteca',
        track: 'una canción',
        profile: 'un perfil',
        queue: 'la cola',
      } as Record<string, string>
    )[type] ?? 'Aurevix'
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  artWrap: { alignItems: 'center', paddingHorizontal: spacing.xl },
  artShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  tool: { alignItems: 'center', gap: 4, minWidth: 56, paddingVertical: 4 },
  toolText: { fontFamily: fonts.bodyStrong, fontSize: 15, lineHeight: 22 },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  sheetUpsell: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.md },
  repeatOne: { position: 'absolute', right: 0, top: 0, color: colors.accentStrong },
  error: { color: colors.danger, textAlign: 'center', paddingHorizontal: spacing.xl },
});
