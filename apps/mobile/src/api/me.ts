import type { AppRole, NotificationRow, ProfileUpdateInput, UserSettings } from '@ordyx/shared';
import { supabase } from '@/lib/supabase';
import { unwrap } from './client';
import { currentUserId } from './library';
import { PROFILE_FIELDS, type ProfileSummary } from './types';

export async function getMyProfile(): Promise<ProfileSummary> {
  const me = await currentUserId();
  return unwrap(
    await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', me).single(),
  ) as ProfileSummary;
}

export async function updateMyProfile(
  patch: Partial<ProfileUpdateInput> & { avatar_path?: string | null },
) {
  const me = await currentUserId();
  unwrap(await supabase.from('profiles').update(patch).eq('id', me));
}

export async function getMyRoles(): Promise<AppRole[]> {
  const me = await currentUserId();
  const rows = unwrap(await supabase.from('user_roles').select('role').eq('user_id', me)) as {
    role: AppRole;
  }[];
  return rows.map((r) => r.role);
}

export async function getMySettings(): Promise<UserSettings> {
  const me = await currentUserId();
  return unwrap(
    await supabase.from('user_settings').select('*').eq('user_id', me).single(),
  ) as UserSettings;
}

export async function updateMySettings(
  patch: Partial<
    Pick<
      UserSettings,
      'show_likes_public' | 'show_history_public' | 'allow_explicit' | 'email_notifications'
    >
  >,
) {
  const me = await currentUserId();
  unwrap(await supabase.from('user_settings').update(patch).eq('user_id', me));
}

/** Para cuentas creadas con Google o Apple, que no pasan por el formulario de registro. */
export async function acceptTerms() {
  unwrap(await supabase.rpc('accept_terms'));
}

export async function getNotifications(): Promise<NotificationRow[]> {
  const me = await currentUserId();
  return unwrap(
    await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(50),
  ) as NotificationRow[];
}

export async function markAllNotificationsRead() {
  unwrap(await supabase.rpc('mark_all_notifications_read'));
}

export async function exportMyData(): Promise<unknown> {
  return unwrap(await supabase.rpc('export_my_data'));
}

/** Elimina la cuenta mediante la Edge Function `delete-account` (requiere service_role en el servidor). */
export async function deleteMyAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
}
