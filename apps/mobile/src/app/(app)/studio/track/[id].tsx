import {
  firstError,
  TRACK_STATUS_LABELS,
  trackMetadataSchema,
  type TrackLicense,
} from '@ordyx/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { getGenres } from '@/api/catalog';
import type { TrackDetail } from '@/api/types';
import { deleteTrack, getMyTracks, submitTrack, unpublishTrack, updateTrack } from '@/api/upload';
import { useToast } from '@/components/Toast';
import { TrackMetaForm, type TrackMetaValues } from '@/components/TrackMetaForm';
import { Badge, Button, ErrorState, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';
import { STATUS_TONE } from '@/lib/track-status';

export default function EditTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tracks = useQuery({ queryKey: ['studio', 'tracks'], queryFn: getMyTracks });
  const track = tracks.data?.find((t) => t.id === id);
  if (tracks.isLoading) return <Loading />;
  if (!track)
    return <ErrorState message={toUserMessage(tracks.error ?? new Error('ordyx:not_found'))} />;
  return <EditTrack track={track} />;
}

function EditTrack({ track }: { track: TrackDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const genres = useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: 3_600_000 });
  const [meta, setMeta] = useState<TrackMetaValues>({
    title: track.title,
    description: track.description ?? '',
    genre_id: track.genre_id,
    license: track.license as TrackLicense,
    rights_holder: track.rights_holder ?? '',
    is_explicit: track.is_explicit,
  });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.show(ok, 'success');
      await qc.invalidateQueries({ queryKey: ['studio'] });
    } catch (e) {
      toast.show(toUserMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  function save() {
    const parsed = trackMetadataSchema.safeParse({
      ...meta,
      description: meta.description.trim() || null,
      release_date: track.release_date,
    });
    if (!parsed.success) return toast.show(firstError(parsed.error), 'error');
    void run(() => updateTrack(track.id, parsed.data), 'Cambios guardados');
  }

  const canSubmit = (track.status === 'draft' || track.status === 'rejected') && !!track.audio_path;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.lg,
        paddingBottom: spacing.xxl * 3,
      }}
    >
      <Stack.Screen options={{ title: 'Editar canción' }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <Badge label={TRACK_STATUS_LABELS[track.status]} tone={STATUS_TONE[track.status]} />
        <Text variant="caption" muted>
          {track.play_count} reproducciones válidas · {track.like_count} me gusta
        </Text>
      </View>
      {track.review_note ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceElevated,
          }}
        >
          <Text variant="caption" muted>
            Nota de moderación
          </Text>
          <Text>{track.review_note}</Text>
        </View>
      ) : null}
      {track.status === 'removed' ? (
        <Text muted>
          Esta canción ha sido retirada por moderación y no puede editarse. Si crees que es un
          error, contacta con soporte.
        </Text>
      ) : (
        <>
          {genres.data ? (
            <TrackMetaForm values={meta} onChange={setMeta} genres={genres.data} />
          ) : null}
          <Button label="Guardar cambios" onPress={save} loading={busy} />
          {canSubmit ? (
            <Button
              label="Enviar a revisión"
              variant="secondary"
              icon="send-outline"
              onPress={() =>
                Alert.alert(
                  'Confirmar derechos',
                  'Confirmo que tengo los derechos o la autorización para publicar esta canción.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Confirmo',
                      onPress: () => void run(() => submitTrack(track.id), 'Enviada a revisión'),
                    },
                  ],
                )
              }
            />
          ) : null}
          {track.status === 'published' || track.status === 'pending_review' ? (
            <Button
              label="Retirar de la publicación"
              variant="secondary"
              icon="eye-off-outline"
              onPress={() => void run(() => unpublishTrack(track.id), 'Vuelve a ser un borrador')}
            />
          ) : null}
          {track.status === 'published' ? (
            <Button
              label="Ver en el catálogo"
              variant="ghost"
              onPress={() => router.push(`/track/${track.id}`)}
            />
          ) : null}
        </>
      )}
      <Button
        label="Eliminar canción"
        variant="danger"
        icon="trash-outline"
        onPress={() =>
          Alert.alert(
            'Eliminar canción',
            'Se borrarán la canción, su audio, sus comentarios y estadísticas. No se puede deshacer.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () =>
                  void run(async () => {
                    await deleteTrack(track);
                    router.back();
                  }, 'Canción eliminada'),
              },
            ],
          )
        }
      />
    </ScrollView>
  );
}
