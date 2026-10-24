// Edge Function: eliminación de la cuenta del usuario que la invoca (derecho de supresión, RGPD art. 17).
// - Verifica la identidad con el JWT del propio usuario (no acepta un id en el cuerpo).
// - Borra sus archivos de Storage (carpetas {uid}/ de cada bucket) y después el usuario de Auth;
//   el resto de datos se elimina en cascada por las claves foráneas.
// - La clave service_role solo existe aquí, en el servidor (variable inyectada por Supabase).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const BUCKETS = ['avatars', 'covers', 'playlist-images', 'audio'];
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

async function listAll(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      // Las "carpetas" no tienen id; los archivos sí.
      if (item.id === null) out.push(...(await listAll(admin, bucket, path)));
      else out.push(path);
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'not_allowed' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'not_allowed' }, 401);
  const uid = userData.user.id;

  try {
    for (const bucket of BUCKETS) {
      const paths = await listAll(admin, bucket, uid);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (error) throw error;
      }
    }
    await admin.from('admin_audit_logs').insert({ actor_id: null, action: 'account.self_delete', target_type: 'user', target_id: uid, details: {} });
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    // Sin datos personales en el log: solo el mensaje técnico.
    console.error('delete-account failed', e instanceof Error ? e.message : String(e));
    return json({ error: 'delete_failed' }, 500);
  }
});
