import type { AppRole } from '@ordyx/shared';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverClient } from './supabase-server';

export interface StaffSession {
  userId: string;
  email: string;
  roles: AppRole[];
  isAdmin: boolean;
}

/**
 * Verificación en el SERVIDOR (cada página y cada acción): sesión válida contra Supabase Auth
 * (`getUser`, no solo la cookie) y rol leído de `user_roles`. Ocultar botones no es seguridad:
 * además, todas las funciones admin_* de la base de datos vuelven a comprobar el rol.
 */
export const requireStaff = cache(async (): Promise<StaffSession> => {
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');
  const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
  const roles = (rows ?? []).map((r) => r.role as AppRole);
  if (!roles.includes('admin') && !roles.includes('moderator')) redirect('/login?error=sin-permisos');
  return { userId: data.user.id, email: data.user.email ?? '', roles, isAdmin: roles.includes('admin') };
});

export async function requireAdmin(): Promise<StaffSession> {
  const s = await requireStaff();
  if (!s.isAdmin) redirect('/?error=solo-administradores');
  return s;
}
