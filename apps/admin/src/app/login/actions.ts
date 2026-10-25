'use server';

import { emailSchema, toUserMessage } from '@ordyx/shared';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isStaffUser } from '@/lib/staff';
import { serverClient } from '@/lib/supabase-server';

export async function signIn(_prev: string | null, form: FormData): Promise<string | null> {
  const email = emailSchema.safeParse(form.get('email'));
  const password = String(form.get('password') ?? '');
  if (!email.success || !password) return 'Introduce un correo y una contraseña válidos';
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return toUserMessage(error);
  if (!(await isStaffUser(supabase, data.user.id))) {
    await supabase.auth.signOut();
    return 'Esta cuenta no tiene permisos de administración o moderación.';
  }
  redirect('/');
}

/**
 * Inicio de sesión con Google (Supabase Auth, flujo PKCE): Google devuelve al usuario a
 * /auth/callback, que canjea el código por la sesión y comprueba el rol.
 */
export async function signInWithGoogle() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${proto}://${host}/auth/callback` },
  });
  if (error || !data.url) redirect('/login?error=google');
  redirect(data.url);
}

export async function signOut() {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect('/login');
}
