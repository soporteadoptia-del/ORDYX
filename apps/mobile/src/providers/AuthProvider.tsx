import type { AppRole } from '@ordyx/shared';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMyProfile, getMyRoles } from '@/api/me';
import type { ProfileSummary } from '@/api/types';
import { supabase } from '@/lib/supabase';
import { clearPersistedPlayer } from '@/player/store';

interface AuthContextValue {
  session: Session | null;
  initializing: boolean;
  profile: ProfileSummary | null;
  roles: AppRole[];
  canUpload: boolean;
  isStaff: boolean;
  signOut: (scope?: 'local' | 'global') => Promise<void>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setInitializing(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const profileQuery = useQuery({
    queryKey: ['me', 'profile', userId],
    queryFn: getMyProfile,
    enabled: !!userId,
  });
  const rolesQuery = useQuery({
    queryKey: ['me', 'roles', userId],
    queryFn: getMyRoles,
    enabled: !!userId,
  });

  const value = useMemo<AuthContextValue>(() => {
    const roles = rolesQuery.data ?? [];
    return {
      session,
      initializing,
      profile: profileQuery.data ?? null,
      roles,
      canUpload:
        profileQuery.data?.status === 'active' &&
        (roles.includes('artist') || roles.includes('admin')),
      isStaff: roles.includes('admin') || roles.includes('moderator'),
      async signOut(scope = 'local') {
        await clearPersistedPlayer();
        // scope 'global' revoca las sesiones de TODOS los dispositivos.
        await supabase.auth.signOut({ scope });
        queryClient.clear();
      },
      refreshProfile() {
        void profileQuery.refetch();
        void rolesQuery.refetch();
      },
    };
  }, [session, initializing, profileQuery, rolesQuery, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
