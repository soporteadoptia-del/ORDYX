import type { SupabaseClient } from '@supabase/supabase-js';

/** true si el usuario tiene rol de administración o moderación (lo comprueba la RLS de user_roles). */
export async function isStaffUser(supabase: SupabaseClient, userId: string) {
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
  return !!roles?.some((r) => r.role === 'admin' || r.role === 'moderator');
}
