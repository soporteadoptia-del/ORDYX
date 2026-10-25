import type { Metadata } from 'next';
import './globals.css';

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap';

export const metadata: Metadata = {
  title: {
    default: 'Aurevix Music · Administración',
    template: '%s · Administración Aurevix Music',
  },
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Mismas fuentes que aurevixweb.es. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
