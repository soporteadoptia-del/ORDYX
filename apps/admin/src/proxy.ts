import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresca la sesión de Supabase en cada petición y redirige al login si no hay usuario.
 * Es una comprobación optimista: la autorización real se hace en el servidor (lib/auth.ts) y en la base de datos.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  // /auth/callback recibe la vuelta de Google antes de que exista la sesión.
  const isLogin = pathname.startsWith('/login') || pathname.startsWith('/auth/');
  if (!data.user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.png|logo-a.png).*)'],
};
