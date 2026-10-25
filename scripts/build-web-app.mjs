#!/usr/bin/env node
/**
 * Exporta la app de Expo como aplicación web y la deja en apps/web/public/app, para servirla en
 * https://<web>/app. En iPhone se instala con Safari → Compartir → «Añadir a pantalla de inicio»
 * (hasta que haya versión en TestFlight/App Store).
 *
 * Lo ejecuta `pnpm --filter web build` antes de `next build`. Si la exportación falla, la web se
 * compila igualmente (sin /app) para no bloquear el despliegue.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(root, 'apps/mobile');
const out = join(root, 'apps/web/public/app');
const BASE = '/app';

if (process.env.SKIP_WEB_APP === '1') {
  console.log('SKIP_WEB_APP=1: no se exporta la app web.');
  process.exit(0);
}

const env = {
  ...process.env,
  // Solo valores públicos: los mismos que usa la web.
  EXPO_PUBLIC_SUPABASE_URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    '',
  EXPO_PUBLIC_WEB_URL:
    process.env.EXPO_PUBLIC_WEB_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://ordyx.vercel.app',
  EXPO_WEB_BASE_URL: BASE,
  EXPO_OFFLINE: '1',
  CI: '1',
};

rmSync(out, { recursive: true, force: true });
const res = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
  cwd: mobile,
  env,
  stdio: 'inherit',
});
if (res.status !== 0 || !existsSync(join(out, 'index.html'))) {
  console.warn('⚠ No se ha podido exportar la app web; la web se publica sin /app.');
  rmSync(out, { recursive: true, force: true });
  process.exit(0);
}

// Metadatos para instalarla en la pantalla de inicio (iOS y Android).
writeFileSync(
  join(out, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'Aurevix Music',
      short_name: 'Aurevix',
      description: 'Escucha, descubre y comparte música independiente.',
      start_url: `${BASE}/`,
      scope: `${BASE}/`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0C0C0E',
      theme_color: '#0C0C0E',
      icons: [
        { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ),
);

const indexPath = join(out, 'index.html');
let html = readFileSync(indexPath, 'utf8');
const head = `
    <title>Aurevix Music</title>
    <meta name="description" content="Escucha, descubre y comparte música independiente." />
    <meta name="theme-color" content="#0C0C0E" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Aurevix" />
    <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
    <link rel="manifest" href="${BASE}/manifest.webmanifest" />
    <style>
      html,body{background:#0C0C0E}
      /* iOS ignora overflow:hidden en body al deslizar: sin esto la página entera se desplazaba
         y la app quedaba «subida» bajo la barra de estado, con una franja negra abajo. */
      html,body{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none}
      /* El hueco de la barra de estado y de la barra de inicio lo pone el CSS (la app no suma
         márgenes en la web). En el iPhone instalado hay un mínimo por si el sistema da 0. */
      #root{position:fixed;inset:0;height:auto;padding-top:env(safe-area-inset-top);box-sizing:border-box}
      .ios-standalone #root{padding-top:max(env(safe-area-inset-top),47px)}
      .ios-standalone,.ios-standalone body{height:var(--app-h,100%)}
      .ios-standalone body,.ios-standalone #root{bottom:auto;height:var(--app-h,100%)}
    </style>
    <script>
      // iPhone instalado: Safari a veces da a la página una altura más corta que la pantalla y
      // queda un hueco negro bajo la barra de pestañas. Se fija la altura real de la pantalla.
      if (navigator.standalone === true) {
        var d = document.documentElement;
        d.classList.add('ios-standalone');
        var fit = function () {
          var h = Math.max(window.innerHeight, screen.height);
          if (window.matchMedia('(orientation: landscape)').matches) h = window.innerHeight;
          d.style.setProperty('--app-h', h + 'px');
        };
        fit();
        window.addEventListener('resize', fit);
        window.addEventListener('orientationchange', function () { setTimeout(fit, 300); });
      }
    </script>
`;
html = html
  .replace(/<html lang="[^"]*"/, '<html lang="es"')
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace('</head>', `${head}</head>`);
// Ocupar toda la pantalla bajo la muesca del iPhone.
html = html.replace(
  /<meta name="viewport" content="([^"]*)"/,
  (_m, c) =>
    `<meta name="viewport" content="${c.includes('viewport-fit') ? c : `${c}, viewport-fit=cover`}"`,
);
writeFileSync(indexPath, html);
console.log(`✔ App web exportada en ${out}`);
