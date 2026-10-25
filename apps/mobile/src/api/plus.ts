import { supabase } from '@/lib/supabase';
import { unwrap } from './client';

/** Estado de Aurevix Premium del usuario actual (`public.my_plus`). */
export interface PlusStatus {
  active: boolean;
  expires_at: string | null;
  source: 'bizum' | 'gift' | null;
  pending_id: string | null;
  pending_reference: string | null;
  pending_amount_cents: number | null;
  pending_created_at: string | null;
  last_rejection_note: string | null;
}

export interface PlusPayment {
  id: string;
  reference: string;
  amount_cents: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payer_note: string | null;
  created_at: string;
}

export interface PlusOffer {
  priceCents: number;
  bizumPhone: string;
}

export interface ListeningStats {
  since: string;
  minutes: number;
  plays: number;
  distinct_tracks: number;
  top_tracks: {
    id: string;
    title: string;
    cover_path: string | null;
    artist: string | null;
    plays: number;
    minutes: number;
  }[];
  top_artists: { id: string; name: string; image_path: string | null; minutes: number }[];
  top_genres: { id: number; name: string; minutes: number }[];
  by_hour: { hour: number; minutes: number }[];
}

export async function getMyPlus(): Promise<PlusStatus> {
  const rows = unwrap(await supabase.rpc('my_plus')) as PlusStatus[];
  return rows[0];
}

/** Precio y teléfono de Bizum: se leen de la configuración pública para poder cambiarlos sin publicar la app. */
export async function getPlusOffer(): Promise<PlusOffer> {
  const rows = unwrap(
    await supabase
      .from('app_config')
      .select('key,value')
      .in('key', ['plus_monthly_price_cents', 'plus_bizum_phone']),
  ) as { key: string; value: unknown }[];
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  return {
    priceCents: Number(get('plus_monthly_price_cents') ?? 499),
    bizumPhone: String(get('plus_bizum_phone') ?? '602708111'),
  };
}

export async function requestPlus(payerNote?: string): Promise<PlusPayment> {
  return unwrap(
    await supabase.rpc('request_plus', { p_payer_note: payerNote ?? null }),
  ) as PlusPayment;
}

export async function cancelPlusRequest(id: string) {
  unwrap(await supabase.rpc('cancel_plus_request', { p_id: id }));
}

export async function getLyrics(trackId: string): Promise<string | null> {
  return unwrap(await supabase.rpc('get_lyrics', { p_track_id: trackId })) as string | null;
}

export async function hasLyrics(trackId: string): Promise<boolean> {
  return !!unwrap(await supabase.rpc('has_lyrics', { p_track_id: trackId }));
}

export async function setLyrics(trackId: string, lyrics: string | null) {
  unwrap(await supabase.from('tracks').update({ lyrics }).eq('id', trackId));
}

export async function getListeningStats(days: number): Promise<ListeningStats> {
  return unwrap(await supabase.rpc('my_listening_stats', { p_days: days })) as ListeningStats;
}

/** Ruta del audio original (sin comprimir) si el artista lo subió y existe una versión aparte. */
export async function getOriginalAudioPath(trackId: string): Promise<string | null> {
  const row = unwrap(
    await supabase.from('tracks').select('original_audio_path').eq('id', trackId).maybeSingle(),
  ) as { original_audio_path: string | null } | null;
  return row?.original_audio_path ?? null;
}

export const formatEuros = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

/** Nota que dejó el usuario en su solicitud pendiente (p. ej. «Bizum enviado»). */
export async function getPaymentNote(id: string): Promise<string | null> {
  const row = unwrap(
    await supabase.from('plus_payments').select('payer_note').eq('id', id).maybeSingle(),
  ) as { payer_note: string | null } | null;
  return row?.payer_note ?? null;
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
export function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** 602708111 → 602 708 111 */
export const formatPhone = (p: string) => p.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

export interface ArtistStats {
  since: string;
  plays: number;
  listeners: number;
  minutes: number;
  likes: number;
  tracks: {
    id: string;
    title: string;
    artist: string;
    cover_path: string | null;
    status: string;
    plays: number;
    listeners: number;
    minutes: number;
  }[];
}

/** Escuchas de las canciones de mis artistas (Premium; `public.my_artist_stats`). */
export async function getArtistStats(days: number): Promise<ArtistStats> {
  return unwrap(await supabase.rpc('my_artist_stats', { p_days: days })) as ArtistStats;
}
