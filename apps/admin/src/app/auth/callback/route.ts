import { NextResponse, type NextRequest } from 'next/server';
import { isStaffUser } from '@/lib/staff';
import { serverClient } from '@/lib/supabase-server';

/** Vuelta de Google: canjea el código PKCE por la sesión y deja pasar solo a administración o moderación. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  url.search = '';
  if (!code) {
    url.pathname = '/login';
    url.searchParams.set('error', 'google');
    return NextResponse.redirect(url);
  }
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    url.pathname = '/login';
    url.searchParams.set('error', 'google');
    return NextResponse.redirect(url);
  }
  if (!(await isStaffUser(supabase, data.user.id))) {
    await supabase.auth.signOut();
    url.pathname = '/login';
    url.searchParams.set('error', 'sin-permisos');
    return NextResponse.redirect(url);
  }
  url.pathname = '/';
  return NextResponse.redirect(url);
}
