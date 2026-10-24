'use server';

import { emailSchema, toUserMessage } from '@ordyx/shared';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase-server';

export async function signIn(_prev: string | null, form: FormData): Promise<string | null> {
  const email = emailSchema.safeParse(form.get('email'));
  const password = String(form.get('password') ?? '');
  if (!email.success || !password) return 'Introduce un correo y una contraseña válidos';
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return toUserMessage(error);
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id);
  if (!roles?.some((r) => r.role === 'admin' || r.role === 'moderator')) {
    await supabase.auth.signOut();
    return 'Esta cuenta no tiene permisos de administración o moderación.';
  }
  redirect('/');
}

export async function signOut() {
  const supabase = await serverClient();
  await supabase.auth.signOut();
  redirect('/login');
}
