import { BRAND } from '@ordyx/shared';
import type { Metadata, Viewport } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getPublicConfig } from '@/lib/data';
import { env } from '@/lib/env';
import './globals.css';

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

export const viewport: Viewport = { themeColor: '#07070B', colorScheme: 'dark' };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const config = await getPublicConfig();
  return (
    <html lang="es">
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
        <SiteFooter
          name={config.platformName}
          supportEmail={config.supportEmail}
          socialLinks={config.socialLinks}
        />
      </body>
    </html>
  );
}
