import { cacheLife, cacheTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { getVersions, installUrl } from '@/lib/data';

async function latestApk(channel: 'stable' | 'beta') {
  'use cache';
  cacheLife('minutes');
  cacheTag('app-versions');
  const { current } = await getVersions();
  const v = current[`android:${channel}`];
  return v && v.install_method === 'apk' ? installUrl(v) : null;
}

/**
 * Enlace estable «siempre la última versión»: /descargar/android (o ?canal=beta).
 * Redirige al APK publicado y verificado; si no hay ninguno, vuelve a la web con un aviso
 * en lugar de servir un enlace roto.
 */
export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('canal') === 'beta' ? 'beta' : 'stable';
  const target = await latestApk(channel);
  if (!target) {
    return NextResponse.redirect(new URL('/#descargar', request.url), 302);
  }
  return NextResponse.redirect(target, 302);
}
