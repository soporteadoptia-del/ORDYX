'use server';

import { appVersionSchema, firstError } from '@ordyx/shared';
import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { runAndReturn, str } from '@/lib/actions-util';
import { serverClient } from '@/lib/supabase-server';

// Todas las acciones vuelven a comprobar el rol en el servidor y, además, la base de datos lo verifica
// dentro de cada función admin_* (que deja registro en admin_audit_logs).

export async function reviewTrack(form: FormData) {
  await requireStaff();
  const supabase = await serverClient();
  await runAndReturn(str(form, 'back') || '/canciones', 'Canción actualizada', async () =>
    supabase.rpc('admin_review_track', {
      p_track_id: str(form, 'id'),
      p_decision: str(form, 'decision'),
      p_note: str(form, 'note') || null,
    }),
  );
}

export async function setUserStatus(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/usuarios', 'Estado de la cuenta actualizado', async () =>
    supabase.rpc('admin_set_user_status', {
      p_user: str(form, 'id'),
      p_status: str(form, 'status'),
      p_reason: str(form, 'reason') || null,
    }),
  );
}

export async function setUserRole(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/usuarios', 'Roles actualizados', async () =>
    supabase.rpc('admin_set_role', {
      p_user: str(form, 'id'),
      p_role: str(form, 'role'),
      p_grant: str(form, 'grant') === 'true',
    }),
  );
}

export async function resolveReport(form: FormData) {
  await requireStaff();
  const supabase = await serverClient();
  await runAndReturn('/denuncias', 'Denuncia actualizada', async () =>
    supabase.rpc('admin_resolve_report', {
      p_report_id: str(form, 'id'),
      p_status: str(form, 'status'),
      p_note: str(form, 'note') || null,
    }),
  );
}

export async function resolveClaim(form: FormData) {
  await requireStaff();
  const supabase = await serverClient();
  await runAndReturn('/denuncias', 'Reclamación actualizada', async () =>
    supabase.rpc('admin_resolve_rights_claim', {
      p_claim_id: str(form, 'id'),
      p_status: str(form, 'status'),
      p_note: str(form, 'note') || null,
    }),
  );
}

export async function hideComment(form: FormData) {
  await requireStaff();
  const supabase = await serverClient();
  await runAndReturn('/denuncias', 'Comentario actualizado', async () =>
    supabase.rpc('admin_set_comment_hidden', {
      p_comment_id: str(form, 'id'),
      p_hidden: str(form, 'hidden') === 'true',
      p_reason: str(form, 'reason') || null,
    }),
  );
}

export async function setArtistFlags(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/artistas', 'Artista actualizado', async () =>
    supabase.rpc('admin_set_artist_flags', {
      p_artist_id: str(form, 'id'),
      p_verified: form.get('verified') === 'on',
      p_featured: form.get('featured') === 'on',
    }),
  );
}

export async function setPlaylistFeatured(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/artistas', 'Playlist actualizada', async () =>
    supabase.rpc('admin_set_playlist_featured', {
      p_playlist_id: str(form, 'id'),
      p_featured: str(form, 'featured') === 'true',
    }),
  );
}

export async function upsertGenre(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/generos', 'Género guardado', async () =>
    supabase.rpc('admin_upsert_genre', {
      p_slug: str(form, 'slug').toLowerCase(),
      p_name: str(form, 'name'),
      p_sort_order: Number(str(form, 'sort') || 0),
    }),
  );
}

export async function deleteGenre(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/generos', 'Género eliminado', async () =>
    supabase.rpc('admin_delete_genre', { p_genre_id: Number(str(form, 'id')) }),
  );
}

export async function setConfig(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/configuracion', 'Configuración guardada', async () => {
    let value: unknown;
    try {
      value = JSON.parse(str(form, 'value'));
    } catch {
      throw new Error('ordyx:invalid_input');
    }
    return supabase.rpc('admin_set_config', {
      p_key: str(form, 'key'),
      p_value: value,
      p_is_public: form.get('is_public') === 'on',
    });
  });
}

// ---------------------------------------------------------------- versiones de la app
function nullable(form: FormData, key: string) {
  const v = str(form, key);
  return v === '' ? null : v;
}

export async function saveVersion(form: FormData) {
  await requireAdmin();
  const parsed = appVersionSchema.safeParse({
    platform: str(form, 'platform'),
    channel: str(form, 'channel') || 'stable',
    version: str(form, 'version'),
    build_number: Number(str(form, 'build_number')),
    install_method: str(form, 'install_method'),
    release_notes: nullable(form, 'release_notes'),
    min_os_version: nullable(form, 'min_os_version'),
    download_url: nullable(form, 'download_url'),
    storage_path: nullable(form, 'storage_path'),
    file_size_bytes: nullable(form, 'file_size_bytes')
      ? Number(str(form, 'file_size_bytes'))
      : null,
    sha256: nullable(form, 'sha256')?.toLowerCase() ?? null,
  });
  if (!parsed.success) redirect(`/versiones?error=${encodeURIComponent(firstError(parsed.error))}`);
  const supabase = await serverClient();
  await runAndReturn(
    '/versiones',
    'Borrador guardado. Ahora verifícalo antes de publicar.',
    async () =>
      supabase.rpc('admin_save_app_version', { p_id: nullable(form, 'id'), p_data: parsed.data }),
  );
}

/**
 * Verificación de una versión: el SERVIDOR descarga el archivo (sin pasar por el navegador),
 * calcula SHA-256 y tamaño reales y los compara en la base de datos con los declarados.
 * Para TestFlight/App Store comprueba que el enlace responde. En ambos casos exige confirmar
 * que la instalación se ha probado en un dispositivo real.
 */
export async function verifyVersion(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  const id = str(form, 'id');
  const { data: v, error } = await supabase.from('app_versions').select('*').eq('id', id).single();
  if (error || !v) redirect(`/versiones?error=${encodeURIComponent('Versión no encontrada')}`);
  const url: string | null =
    v.download_url ??
    (v.storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/releases/${v.storage_path}`
      : null);
  let sha: string | null = null;
  let size: number | null = null;
  try {
    if (!url) throw new Error('Sin URL');
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
    if (!res.ok || !res.body) throw new Error(`El enlace responde ${res.status}`);
    if (v.install_method === 'apk') {
      const hash = createHash('sha256');
      let total = 0;
      const reader = res.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        hash.update(value);
        total += value.byteLength;
      }
      sha = hash.digest('hex');
      size = total;
    } else {
      await res.body.cancel();
    }
  } catch (e) {
    redirect(
      `/versiones?error=${encodeURIComponent(`No se pudo comprobar el archivo: ${e instanceof Error ? e.message : String(e)}`)}`,
    );
  }
  await runAndReturn(
    '/versiones',
    `Versión verificada${sha ? ` (SHA-256 ${sha.slice(0, 12)}…, ${size} bytes)` : ''}`,
    async () =>
      supabase.rpc('admin_verify_app_version', {
        p_id: id,
        p_measured_sha256: sha,
        p_measured_size: size,
        p_install_tested: form.get('install_tested') === 'on',
      }),
  );
}

export async function publishVersion(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn(
    '/versiones',
    'Versión publicada. La web la mostrará en unos minutos.',
    async () => supabase.rpc('admin_publish_app_version', { p_id: str(form, 'id') }),
  );
}

export async function withdrawVersion(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/versiones', 'Versión retirada', async () =>
    supabase.rpc('admin_withdraw_app_version', {
      p_id: str(form, 'id'),
      p_reason: str(form, 'reason'),
    }),
  );
}

export async function reviewPlusPayment(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  const approve = str(form, 'approve') === 'true';
  await runAndReturn('/plus', approve ? 'Premium activado' : 'Pago rechazado', async () =>
    supabase.rpc('admin_review_plus_payment', {
      p_id: str(form, 'id'),
      p_approve: approve,
      p_note: str(form, 'note') || null,
    }),
  );
}

export async function grantPlus(form: FormData) {
  await requireAdmin();
  const supabase = await serverClient();
  await runAndReturn('/plus', 'Premium regalado', async () => {
    const username = str(form, 'username').replace(/^@/, '');
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username.replace(/[%_\\]/g, '\\$&'))
      .maybeSingle();
    if (error) return { error };
    if (!user) return { error: new Error('ordyx:not_found') };
    return supabase.rpc('admin_grant_plus', {
      p_user: user.id,
      p_months: Number(str(form, 'months')) || 1,
      p_note: str(form, 'note') || null,
    });
  });
}
