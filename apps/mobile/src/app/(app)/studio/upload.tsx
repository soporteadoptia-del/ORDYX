import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AUDIO_EXTENSIONS,
  audioFileSchema,
  fileExtension,
  firstError,
  formatBytes,
  formatDuration,
  imageFileSchema,
  trackMetadataSchema,
} from '@ordyx/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { getGenres } from '@/api/catalog';
import {
  createDraftTrack,
  getMyArtists,
  submitTrack,
  updateTrack,
  uploadAudio,
  uploadImage,
  type LocalFile,
} from '@/api/upload';
import { Artwork } from '@/components/Artwork';
import { pickImage, type PickedImage } from '@/components/PlaylistForm';
import { TrackMetaForm, type TrackMetaValues } from '@/components/TrackMetaForm';
import { Button, Chip, Loading, Text } from '@/components/ui';
import { probeDurationMs } from '@/lib/audio-probe';
import { reportError, toUserMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

type Step = 'form' | 'uploading' | 'done';

export default function Upload() {
  const params = useLocalSearchParams<{ artistId?: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const artists = useQuery({ queryKey: ['studio', 'artists'], queryFn: getMyArtists });
  const genres = useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: 3_600_000 });
  const [artistId, setArtistId] = useState<string | null>(params.artistId ?? null);
  const [audio, setAudio] = useState<(LocalFile & { durationMs: number | null }) | null>(null);
  const [cover, setCover] = useState<PickedImage | null>(null);
  const [meta, setMeta] = useState<TrackMetaValues>({
    title: '',
    description: '',
    genre_id: null,
    license: 'all-rights-reserved',
    rights_holder: '',
    is_explicit: false,
  });
  const [rights, setRights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const selectedArtist = artistId ?? artists.data?.[0]?.id ?? null;

  async function chooseAudio() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const mimeType =
      a.mimeType && a.mimeType !== 'application/octet-stream'
        ? a.mimeType
        : (AUDIO_EXTENSIONS[fileExtension(a.name)] ?? a.mimeType ?? '');
    const parsed = audioFileSchema.safeParse({ name: a.name, size: a.size ?? 0, mimeType });
    if (!parsed.success) return setError(firstError(parsed.error));
    setError(null);
    const durationMs = await probeDurationMs(a.uri);
    if (!durationMs)
      return setError('No se ha podido leer el archivo de audio. Comprueba que no esté dañado.');
    setAudio({ uri: a.uri, name: a.name, size: a.size ?? 0, mimeType, durationMs });
    if (!meta.title)
      setMeta((m) => ({ ...m, title: a.name.replace(/\.[^.]+$/, '').slice(0, 120) }));
  }

  async function chooseCover() {
    const img = await pickImage();
    if (!img) return;
    const parsed = imageFileSchema.safeParse({ size: img.size || 1, mimeType: img.mimeType });
    if (!parsed.success) return setError(firstError(parsed.error));
    setCover(img);
  }

  async function start() {
    if (!selectedArtist) return setError('Elige el artista con el que publicas');
    if (!audio) return setError('Selecciona un archivo de audio');
    const parsed = trackMetadataSchema.safeParse({
      ...meta,
      description: meta.description.trim() || null,
      release_date: null,
    });
    if (!parsed.success) return setError(firstError(parsed.error));
    if (!rights)
      return setError('Debes confirmar que tienes los derechos para publicar esta canción');
    setError(null);
    setStep('uploading');
    abort.current = new AbortController();
    let trackId: string | null = null;
    try {
      setStage('Creando borrador…');
      trackId = await createDraftTrack(selectedArtist, parsed.data, audio.durationMs);
      setStage('Subiendo audio…');
      const audioPath = await uploadAudio(trackId, audio, setProgress, abort.current.signal);
      let coverPath: string | null = null;
      if (cover) {
        setStage('Subiendo portada…');
        coverPath = (await uploadImage('trackCover', cover, session!.user.id, trackId)).path;
      }
      setStage('Guardando…');
      await updateTrack(trackId, {
        audio_path: audioPath,
        audio_mime: audio.mimeType,
        audio_size_bytes: audio.size,
        cover_path: coverPath,
      });
      setStage('Enviando a revisión…');
      const status = await submitTrack(trackId);
      setResult(status);
      setStep('done');
      void qc.invalidateQueries({ queryKey: ['studio'] });
    } catch (e) {
      reportError(e, { where: 'upload', trackId: trackId ?? 'none' });
      setStep('form');
      setError(
        `${toUserMessage(e)}${trackId ? ' La canción se ha guardado como borrador: puedes reintentarlo desde el Estudio.' : ''}`,
      );
      void qc.invalidateQueries({ queryKey: ['studio'] });
    }
  }

  if (artists.isLoading || genres.isLoading) return <Loading />;

  if (step === 'done') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Subida completada' }} />
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        <Text variant="title" style={{ textAlign: 'center' }}>
          {result === 'published'
            ? '¡Publicada!'
            : result === 'processing'
              ? 'En proceso'
              : 'Enviada a revisión'}
        </Text>
        <Text muted style={{ textAlign: 'center' }}>
          {result === 'published'
            ? 'Tu canción ya está disponible en el catálogo.'
            : 'Te avisaremos con una notificación cuando el equipo de moderación la revise.'}
        </Text>
        <Button label="Volver al Estudio" onPress={() => router.replace('/studio')} />
      </View>
    );
  }

  if (step === 'uploading') {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Subiendo…', gestureEnabled: false }} />
        <Text variant="heading">{stage}</Text>
        <View
          style={styles.bar}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        >
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text muted>
          {Math.round(progress * 100)} % · {formatBytes(audio?.size)}
        </Text>
        <Button
          label="Cancelar"
          variant="secondary"
          compact
          onPress={() => abort.current?.abort()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.xl,
        paddingBottom: spacing.xxl * 3,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Subir canción' }} />
      {(artists.data?.length ?? 0) > 1 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" muted>
            Artista
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {artists.data!.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={selectedArtist === a.id}
                onPress={() => setArtistId(a.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={chooseAudio}
        style={styles.drop}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar archivo de audio"
      >
        <Ionicons
          name={audio ? 'musical-note' : 'cloud-upload-outline'}
          size={32}
          color={colors.accentStrong}
        />
        {audio ? (
          <>
            <Text variant="bodyStrong" numberOfLines={1}>
              {audio.name}
            </Text>
            <Text variant="caption" muted>
              {formatBytes(audio.size)} · {formatDuration(audio.durationMs)} · toca para cambiar
            </Text>
          </>
        ) : (
          <>
            <Text variant="bodyStrong">Selecciona el archivo de audio</Text>
            <Text variant="caption" muted>
              MP3, M4A, AAC, WAV, FLAC u OGG · máx. 200 MB
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={chooseCover}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        accessibilityRole="button"
        accessibilityLabel="Elegir portada"
      >
        <Artwork uri={cover?.uri ?? null} size={88} seed={meta.title} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Portada</Text>
          <Text variant="caption" muted>
            JPG, PNG o WebP cuadrada · máx. 5 MB. Opcional.
          </Text>
        </View>
      </Pressable>

      {genres.data ? <TrackMetaForm values={meta} onChange={setMeta} genres={genres.data} /> : null}

      <View style={styles.rights}>
        <Switch
          value={rights}
          onValueChange={setRights}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel="Confirmo que tengo los derechos"
        />
        <Text variant="caption" style={{ flex: 1 }}>
          Confirmo que soy titular de esta grabación y de la obra musical, o que tengo autorización
          expresa de sus titulares para publicarla en Aurevix Music. Entiendo que subir música de
          terceros sin permiso conlleva su retirada y la posible suspensión de mi cuenta.
        </Text>
      </View>

      {error ? (
        <Text style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button
        label="Subir y enviar a revisión"
        icon="cloud-upload-outline"
        onPress={start}
        disabled={!audio || !rights}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  bar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: 8, backgroundColor: colors.accentStrong },
  drop: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
  },
  rights: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
});
