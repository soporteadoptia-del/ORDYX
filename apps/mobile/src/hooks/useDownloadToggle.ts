import { router } from 'expo-router';
import { useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { toUserMessage } from '@/lib/errors';
import { downloadTrack, removeDownload, useDownloads } from '@/player/downloads';
import type { PlayableTrack } from '@/player/store';
import { usePlus } from './usePlus';

/** Descarga o borra una canción. Sin Premium lleva a la pantalla de Premium. */
export function useDownloadToggle() {
  const { isPlus } = usePlus();
  const toast = useToast();
  const items = useDownloads((s) => s.items);
  const active = useDownloads((s) => s.active);

  const toggle = useCallback(
    async (track: PlayableTrack) => {
      if (useDownloads.getState().items[track.id]) {
        removeDownload(track.id);
        toast.show('Descarga borrada');
        return;
      }
      if (!isPlus) {
        router.push('/plus');
        return;
      }
      toast.show('Descargando…');
      try {
        await downloadTrack(track);
        toast.show(`«${track.title}» ya suena sin conexión`, 'success');
      } catch (e) {
        toast.show(toUserMessage(e), 'error');
      }
    },
    [isPlus, toast],
  );

  return {
    toggle,
    isDownloaded: (id: string) => !!items[id],
    isDownloading: (id: string) => active[id] !== undefined,
  };
}
