import { BRAND } from '@ordyx/shared';
import type { Metadata, Viewport } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { RevealObserver } from '@/components/RevealObserver';
import { SiteHeader } from '@/components/SiteHeader';
import { getPublicConfig } from '@/lib/data';
import { env } from '@/lib/env';
import './globals.css';

/**
 * Si Supabase devuelve a la web una sesión o un error de inicio de sesión (vuelta de Google,
 * enlace de recuperación o de confirmación), se reenvía a la app web en /app, que es quien la lee.
 * Pasa cuando la dirección pedida no está en las Redirect URLs de Supabase y usa la Site URL.
 */
const AUTH_FORWARD = `document.documentElement.classList.add('js');(function(){try{var l=location;if(l.pathname.indexOf('/app')===0)return;var h=l.hash||'';if(!/access_token=|error_description=/.test(h))return;l.replace((/type=recovery/.test(h)?'/app/reset-password':'/app/')+h);}catch(e){}})();`;

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap';

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: `${BRAND.name} — Música independiente y tus playlists`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  icons: { icon: '/brand/favicon.png', apple: '/brand/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: `${BRAND.name} — Música independiente y tus playlists`,
    description: BRAND.description,
    images: [{ url: '/brand/icon-512.png', width: 512, height: 512 }],
    locale: 'es_ES',
  },
  twitter: { card: 'summary', title: BRAND.name, description: BRAND.tagline },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = { themeColor: '#0C0C0E', colorScheme: 'dark' };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const config = await getPublicConfig();
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: AUTH_FORWARD }} />
        {/* Mismas fuentes que aurevixweb.es. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="min-h-screen">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-fg focus:px-3 focus:py-2 focus:text-ink"
        >
          Saltar al contenido
        </a>
        {config.maintenanceMessage ? (
          <div role="status" className="bg-warning/15 px-4 py-2 text-center text-sm text-warning">
            {config.maintenanceMessage}
          </div>
        ) : null}
        <SiteHeader name={config.platformName} />
        <main id="contenido">{children}</main>
        <RevealObserver />
        <SiteFooter
          name={config.platformName}
          supportEmail={config.supportEmail}
          socialLinks={config.socialLinks}
        />
      </body>
    </html>
  );
}
