import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Share, View } from 'react-native';
import { getMyPlaylists } from '@/api/library';
import { getCollabPlaylists } from '@/api/together';
import { addTrackToPlaylist } from '@/api/playlists';
import type { TrackListItem } from '@/api/types';
import { useLikes } from '@/hooks/useLikes';
import { env } from '@/lib/env';
import { toUserMessage } from '@/lib/errors';
import { toPlayable, usePlayer } from '@/player/store';
import { startRadio } from '@/player/radio';
import { useReposts } from '@/hooks/useReposts';
import { useDownloadToggle } from '@/hooks/useDownloadToggle';
import { downloadsSupported } from '@/player/downloads';
import { colors, spacing } from '@/theme';
import { Sheet, SheetItem } from './Sheet';
import { useToast } from './Toast';
import { Loading, Text } from './ui';

const Ctx = createContext<(track: TrackListItem) => void>(() => undefined);
export const useTrackActions = () => useContext(Ctx);

const icon = (name: React.ComponentProps<typeof Ionicons>['name'], color: string = colors.text) => (
  <Ionicons name={name} size={22} color={color} />
);

export function shareTrack(track: { id: string; title: string; artistName?: string }) {
  const url = `${env.webUrl}/t/${track.id}`;
  return Share.share({
    message: `${track.title}${track.artistName ? ` · ${track.artistName}` : ''} — ${url}`,
    url,
  });
}

export function TrackActionsProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<TrackListItem | null>(null);
  const [mode, setMode] = useState<'menu' | 'playlists'>('menu');
  const open = useCallback((t: TrackListItem) => {
    setMode('menu');
    setTrack(t);
  }, []);
  const close = () => setTrack(null);
  const toast = useToast();
  const { isLiked, toggle } = useLikes();
  const addNext = usePlayer((s) => s.addNext);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const qc = useQueryClient();

  const playlists = useQuery({
    queryKey: ['library', 'addTargets'],
    // Mis listas y las colaborativas en las que participo.
    queryFn: async () => [
      ...(await getMyPlaylists()),
      ...(await getCollabPlaylists().catch(() => [])),
    ],
    enabled: mode === 'playlists' && !!track,
  });
  const add = useMutation({
    mutationFn: ({ playlistId }: { playlistId: string }) =>
      addTrackToPlaylist(playlistId, track!.id),
    onSuccess: (_d, { playlistId }) => {
      toast.show('Añadida a la playlist', 'success');
      void qc.invalidateQueries({ queryKey: ['playlist', playlistId] });
      void qc.invalidateQueries({ queryKey: ['library', 'myPlaylists'] });
      close();
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  const playable = track ? toPlayable(track) : null;
  const downloads = useDownloadToggle();
  const reposts = useReposts();

  return (
    <Ctx.Provider value={open}>
      {children}
      <Sheet
        visible={!!track}
        onClose={close}
        title={track ? `${track.title} · ${track.artist?.name ?? ''}` : undefined}
      >
        {track && mode === 'menu' ? (
          <View>
            <SheetItem
              icon={icon(
                isLiked(track.id) ? 'heart' : 'heart-outline',
                isLiked(track.id) ? colors.accentWarm : colors.text,
              )}
              label={isLiked(track.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              onPress={() => {
                toggle(track.id);
                close();
              }}
            />
            {track.status === 'published' ? (
              <SheetItem
                icon={icon(
                  'repeat',
                  reposts.isReposted(track.id) ? colors.accentStrong : colors.text,
                )}
                label={reposts.isReposted(track.id) ? 'Quitar repost' : 'Repostear'}
                onPress={() => {
                  reposts.toggle(track.id);
                  close();
                }}
              />
            ) : null}
            <SheetItem
              icon={icon('add-circle-outline')}
              label="Añadir a una playlist"
              onPress={() => setMode('playlists')}
            />
            {playable ? (
              <>
                <SheetItem
                  icon={icon('play-forward-outline')}
                  label="Reproducir a continuación"
                  onPress={() => {
                    addNext(playable);
                    toast.show('Se reproducirá a continuación');
                    close();
                  }}
                />
                <SheetItem
                  icon={icon('radio-outline')}
                  label="Radio de esta canción"
                  onPress={() => {
                    void startRadio(playable);
                    toast.show('Radio en marcha: después sonará música parecida', 'success');
                    close();
                  }}
                />
                <SheetItem
                  icon={icon('list-outline')}
                  label="Añadir a la cola"
                  onPress={() => {
                    addToQueue(playable);
                    toast.show('Añadida a la cola');
                    close();
                  }}
                />
                {downloadsSupported ? (
                  <SheetItem
                    icon={icon(
                      downloads.isDownloaded(track.id)
                        ? 'checkmark-circle'
                        : 'arrow-down-circle-outline',
                      downloads.isDownloaded(track.id) ? colors.accentStrong : colors.text,
                    )}
                    label={
                      downloads.isDownloaded(track.id)
                        ? 'Borrar la descarga'
                        : downloads.isDownloading(track.id)
                          ? 'Descargando…'
                          : 'Descargar (Premium)'
                    }
                    onPress={() => {
                      close();
                      void downloads.toggle(playable);
                    }}
                  />
                ) : null}
              </>
            ) : null}
            <SheetItem
              icon={icon('chatbubble-ellipses-outline')}
              label="Ver canción y comentarios"
              onPress={() => {
                close();
                router.push(`/track/${track.id}`);
              }}
            />
            {track.artist ? (
              <SheetItem
                icon={icon('person-outline')}
                label="Ir al artista"
                onPress={() => {
                  close();
                  router.push(`/artist/${track.artist!.id}`);
                }}
              />
            ) : null}
            <SheetItem
              icon={icon('paper-plane-outline')}
              label="Enviar a un amigo"
              onPress={() => {
                close();
                router.push({
                  pathname: '/messages',
                  params: { trackId: track.id, title: track.title },
                });
              }}
            />
            <SheetItem
              icon={icon('share-outline')}
              label="Compartir"
              onPress={() => {
                void shareTrack({
                  id: track.id,
                  title: track.title,
                  artistName: track.artist?.name,
                });
                close();
              }}
            />
            <SheetItem
              icon={icon('flag-outline', colors.danger)}
              label="Denunciar"
              danger
              onPress={() => {
                close();
                router.push({
                  pathname: '/report',
                  params: { type: 'track', id: track.id, label: track.title },
                });
              }}
            />
          </View>
        ) : null}
        {track && mode === 'playlists' ? (
          <View style={{ paddingBottom: spacing.md }}>
            <SheetItem
              icon={icon('add', colors.accentStrong)}
              label="Nueva playlist"
              onPress={() => {
                close();
                router.push({ pathname: '/playlist/new', params: { addTrackId: track.id } });
              }}
            />
            {playlists.isLoading ? <Loading /> : null}
            {playlists.error ? (
              <Text muted style={{ padding: spacing.xl }}>
                {toUserMessage(playlists.error)}
              </Text>
            ) : null}
            {playlists.data?.map((p) => (
              <SheetItem
                key={p.id}
                icon={icon('musical-notes-outline')}
                label={p.title}
                onPress={() => add.mutate({ playlistId: p.id })}
              />
            ))}
            {playlists.data?.length === 0 ? (
              <Text muted style={{ padding: spacing.xl }}>
                Todavía no tienes playlists.
              </Text>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </Ctx.Provider>
  );
}
