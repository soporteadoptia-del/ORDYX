/**
 * Panel del propietario dentro de la app. Todo pasa por las mismas funciones `admin_*` que el
 * panel web: el servidor vuelve a comprobar el rol y lo deja en la auditoría, así que esta
 * pantalla no da más poder que el que ya tiene la cuenta.
 */
import { supabase } from '@/lib/supabase';
import { unwrap } from './client';
import { TRACK_FIELDS, type TrackListItem } from './types';

export interface OwnerStats {
  users_total: number;
  users_new_7d: number;
  active_users_1d: number;
  active_users_7d: number;
  valid_plays_1d: number;
  valid_plays_7d: number;
  tracks_published: number;
  tracks_pending: number;
  reports_open: number;
  rights_claims_open: number;
  errors_1d: number;
}

export interface PendingPayment {
  id: string;
  reference: string;
  amount_cents: number;
  payer_note: string | null;
  created_at: string;
  user: { username: string; display_name: string | null } | null;
}

export interface OwnerUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  status: string;
  roles: string[];
}

export async function getOwnerStats(): Promise<OwnerStats> {
  return unwrap(await supabase.rpc('admin_stats')) as OwnerStats;
}

export async function getActivePremiumCount(): Promise<number> {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('user_id', { count: 'exact', head: true })
    .gt('expires_at', new Date().toISOString());
  if (error) throw error;
  return count ?? 0;
}

export async function getPendingPayments(): Promise<PendingPayment[]> {
  return unwrap(
    await supabase
      .from('plus_payments')
      .select(
        'id,reference,amount_cents,payer_note,created_at,user:profiles!plus_payments_user_id_fkey(username,display_name)',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50),
  ) as unknown as PendingPayment[];
}

export async function reviewPayment(id: string, approve: boolean, note?: string) {
  unwrap(
    await supabase.rpc('admin_review_plus_payment', {
      p_id: id,
      p_approve: approve,
      p_note: note ?? null,
    }),
  );
}

export async function getPendingTracks(): Promise<TrackListItem[]> {
  return unwrap(
    await supabase
      .from('tracks')
      .select(TRACK_FIELDS)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(30),
  ) as unknown as TrackListItem[];
}

export async function reviewTrack(id: string, decision: 'publish' | 'reject', note?: string) {
  unwrap(
    await supabase.rpc('admin_review_track', {
      p_track_id: id,
      p_decision: decision,
      p_note: note ?? null,
    }),
  );
}

export async function searchUsers(q: string): Promise<OwnerUser[]> {
  return unwrap(
    await supabase.rpc('admin_list_users', { p_query: q || null, p_limit: 20, p_offset: 0 }),
  ) as OwnerUser[];
}

export async function grantPremium(userId: string, months: number) {
  unwrap(
    await supabase.rpc('admin_grant_plus', {
      p_user: userId,
      p_months: months,
      p_note: 'Desde el panel de la app',
    }),
  );
}

export async function setUserSuspended(userId: string, suspended: boolean) {
  unwrap(
    await supabase.rpc('admin_set_user_status', {
      p_user: userId,
      p_status: suspended ? 'suspended' : 'active',
      p_reason: null,
    }),
  );
}

/** Ajustes que se pueden cambiar desde el móvil. Todos son públicos (la app los lee). */
export const OWNER_SETTINGS = [
  { key: 'plus_monthly_price_cents', label: 'Precio de Premium (céntimos al mes)', kind: 'number' },
  { key: 'plus_bizum_phone', label: 'Teléfono de Bizum', kind: 'text' },
  { key: 'support_email', label: 'Correo de soporte', kind: 'text' },
  {
    key: 'maintenance_message',
    label: 'Aviso de mantenimiento (vacío = sin aviso)',
    kind: 'nullable-text',
  },
] as const;
export type OwnerSettingKey = (typeof OWNER_SETTINGS)[number]['key'];

export async function getOwnerSettings(): Promise<Record<string, unknown>> {
  const rows = unwrap(
    await supabase
      .from('app_config')
      .select('key,value')
      .in(
        'key',
        OWNER_SETTINGS.map((s) => s.key),
      ),
  ) as { key: string; value: unknown }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveOwnerSetting(key: OwnerSettingKey, raw: string) {
  const def = OWNER_SETTINGS.find((s) => s.key === key)!;
  let value: unknown = raw.trim();
  if (def.kind === 'number') {
    const n = Number(raw.replace(',', '.'));
    if (!Number.isInteger(n) || n <= 0) throw new Error('ordyx:invalid_input');
    value = n;
  }
  // `value` no admite NULL: «false» significa «sin aviso» (la web y la app solo muestran textos).
  if (def.kind === 'nullable-text' && !raw.trim()) value = false;
  unwrap(await supabase.rpc('admin_set_config', { p_key: key, p_value: value, p_is_public: true }));
}
