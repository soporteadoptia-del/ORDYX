import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '',
    '/versiones',
    '/ayuda',
    '/condiciones',
    '/privacidad',
    '/aviso-legal',
    '/derechos',
  ].map((path) => ({
    url: `${env.siteUrl}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.5,
  }));
}
