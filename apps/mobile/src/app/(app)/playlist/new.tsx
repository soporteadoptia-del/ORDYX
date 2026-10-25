import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { addTrackToPlaylist, createPlaylist, updatePlaylist } from '@/api/playlists';
import { uploadImage } from '@/api/upload';
import { PlaylistForm } from '@/components/PlaylistForm';
import { useToast } from '@/components/Toast';
import { toUserMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';

export default function NewPlaylist() {
  const { addTrackId } = useLocalSearchParams<{ addTrackId?: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  return (
    <PlaylistForm
      initial={{ title: '', description: null, is_public: false }}
      submitLabel="Crear playlist"
      onSubmit={async (values, cover) => {
        try {
          const id = await createPlaylist(values);
          if (cover) {
            const { path } = await uploadImage('playlist', cover, session!.user.id, id);
            await updatePlaylist(id, { cover_path: path });
          }
          if (addTrackId) await addTrackToPlaylist(id, addTrackId);
          await qc.invalidateQueries({ queryKey: ['library'] });
          toast.show('Playlist creada', 'success');
          router.replace(`/playlist/${id}`);
        } catch (e) {
          throw new Error(toUserMessage(e));
        }
      }}
    />
  );
}
