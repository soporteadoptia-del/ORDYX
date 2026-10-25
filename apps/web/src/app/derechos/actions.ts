'use server';

import { firstError, rightsClaimSchema, toUserMessage } from '@ordyx/shared';
import { anonClient } from '@/lib/supabase';

export type ClaimState = { status: 'idle' | 'ok' | 'error'; message?: string; reference?: string };

/**
 * Envía una reclamación de derechos. Se valida aquí y de nuevo en la base de datos
 * (`submit_rights_claim`, con límites de frecuencia por correo y globales).
 */
export async function submitClaim(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  // Campo trampa para bots: si llega relleno se descarta en silencio.
  if (form.get('website')) return { status: 'ok', message: 'Reclamación recibida.' };
  const parsed = rightsClaimSchema.safeParse({
    claimant_name: form.get('claimant_name'),
    claimant_email: form.get('claimant_email'),
    content_url: form.get('content_url'),
    original_work: form.get('original_work'),
    details: form.get('details'),
    good_faith: form.get('good_faith') === 'on',
  });
  if (!parsed.success) return { status: 'error', message: firstError(parsed.error) };
  const d = parsed.data;
  const { data, error } = await anonClient().rpc('submit_rights_claim', {
    p_claimant_name: d.claimant_name,
    p_claimant_email: d.claimant_email,
    p_content_url: d.content_url,
    p_original_work: d.original_work,
    p_details: d.details,
    p_good_faith: d.good_faith,
  });
  if (error) return { status: 'error', message: toUserMessage(error) };
  return {
    status: 'ok',
    reference: String(data).slice(0, 8),
    message: 'Hemos recibido tu reclamación.',
  };
}
