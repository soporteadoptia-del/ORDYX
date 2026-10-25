import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { getPlaylist, updatePlaylist } from '@/api/playlists';
import { uploadImage } from '@/api/upload';
import { PlaylistForm } from '@/components/PlaylistForm';
import { useToast } from '@/components/Toast';
import { ErrorState, Loading } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { useAuth } from '@/providers/AuthProvider';

export default function EditPlaylist() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['playlist', id], queryFn: () => getPlaylist(id) });
  if (q.isLoading) return <Loading />;
  if (!q.data) return <ErrorState message={toUserMessage(q.error)} />;
  const p = q.data;
  return (
    <PlaylistForm
      initial={{ title: p.title, description: p.description, is_public: p.is_public }}
      currentCover={imageUrl('playlist-images', p.cover_path)}
      submitLabel="Guardar cambios"
      onSubmit={async (values, cover) => {
        try {
          let cover_path = p.cover_path;
          if (cover)
            cover_path = (await uploadImage('playlist', cover, session!.user.id, p.id)).path;
          await updatePlaylist(p.id, { ...values, cover_path });
          await qc.invalidateQueries({ queryKey: ['playlist', id] });
          await qc.invalidateQueries({ queryKey: ['library'] });
          toast.show('Cambios guardados', 'success');
          router.back();
        } catch (e) {
          throw new Error(toUserMessage(e));
        }
      }}
    />
  );
}
