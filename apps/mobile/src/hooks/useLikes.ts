import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { getLikedIds, setLiked } from '@/api/library';
import { toUserMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/Toast';

/** Favoritos sincronizados con Supabase y actualización optimista. */
export function useLikes() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['likes', 'ids', session?.user.id];
  const { data } = useQuery({ queryKey: key, queryFn: getLikedIds, enabled: !!session });

  const mutation = useMutation({
    mutationFn: ({ trackId, liked }: { trackId: string; liked: boolean }) =>
      setLiked(trackId, liked),
    onMutate: async ({ trackId, liked }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Set<string>>(key);
      const next = new Set(previous ?? []);
      if (liked) next.add(trackId);
      else next.delete(trackId);
      qc.setQueryData(key, next);
      return { previous };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.previous);
      toast.show(toUserMessage(e), 'error');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['library', 'liked'] });
    },
  });

  return {
    isLiked: (trackId: string) => data?.has(trackId) ?? false,
    toggle: (trackId: string) => {
      const liked = !(data?.has(trackId) ?? false);
      // Un toque háptico por acción, en el mismo momento que cambia el corazón.
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      mutation.mutate({ trackId, liked });
    },
  };
}
