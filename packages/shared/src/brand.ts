/**
 * Identidad de marca. El nombre es PROVISIONAL: cámbialo aquí (o en `app_config.platform_name`
 * desde el panel de administración para los textos dinámicos de la web) y en `apps/mobile/app.config.ts`.
 */
export const BRAND = {
  name: 'Ordyx',
  tagline: 'Escucha, descubre y comparte música independiente.',
  description:
    'Ordyx es una plataforma musical para escuchar tus canciones favoritas, crear playlists y descubrir artistas independientes que publican su propia música.',
  supportEmail: 'soporte@ordyx.app',
  legalEntity: 'Titular de Ordyx (pendiente de completar)',
  colors: {
    background: '#07070B',
    surface: '#111118',
    surfaceElevated: '#1A1A24',
    border: '#262634',
    text: '#F4F3F8',
    textMuted: '#A09FB2',
    textSubtle: '#6E6D82',
    /** Acento principal: "aurora" violeta-magenta. */
    accent: '#8B5CF6',
    accentStrong: '#A78BFA',
    /** Acento secundario: coral cálido para degradados. */
    accentWarm: '#F472B6',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
  gradient: ['#8B5CF6', '#EC4899'] as const,
} as const;

export type BrandColors = typeof BRAND.colors;
