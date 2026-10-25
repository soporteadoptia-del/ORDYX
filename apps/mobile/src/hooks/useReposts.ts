import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRepostedIds, setReposted } from '@/api/feed';
import { useToast } from '@/components/Toast';
import { toUserMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';

/** Reposts (como en SoundCloud): compartir una canción con quien te sigue. Optimista. */
export function useReposts() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ['reposts', 'ids', session?.user.id];
  const { data } = useQuery({ queryKey: key, queryFn: getRepostedIds, enabled: !!session });

  const mutation = useMutation({
    mutationFn: ({ trackId, on }: { trackId: string; on: boolean }) => setReposted(trackId, on),
    onMutate: async ({ trackId, on }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Set<string>>(key);
      const next = new Set(previous ?? []);
      if (on) next.add(trackId);
      else next.delete(trackId);
      qc.setQueryData(key, next);
      return { previous };
    },
    onSuccess: (_d, v) =>
      toast.show(v.on ? 'Reposteada: la verá quien te sigue' : 'Repost quitado', 'success'),
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.previous);
      toast.show(toUserMessage(e), 'error');
    },
  });

  return {
    isReposted: (trackId: string) => data?.has(trackId) ?? false,
    toggle: (trackId: string) => mutation.mutate({ trackId, on: !(data?.has(trackId) ?? false) }),
  };
}
