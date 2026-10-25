import { useQuery } from '@tanstack/react-query';
import { getMyPlus, getPlusOffer } from '@/api/plus';
import { useAuth } from '@/providers/AuthProvider';

/** Estado de Aurevix Plus del usuario. `isPlus` es false mientras carga. */
export function usePlus() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ['plus', userId],
    queryFn: getMyPlus,
    enabled: !!userId,
    staleTime: 60_000,
  });
  return { ...query, isPlus: !!query.data?.active };
}

export function usePlusOffer() {
  return useQuery({ queryKey: ['plus', 'offer'], queryFn: getPlusOffer, staleTime: 3_600_000 });
}
