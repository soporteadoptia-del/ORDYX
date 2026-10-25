/**
 * Identidad de marca de Aurevix Music. La paleta y la tipografía son las de https://aurevixweb.es
 * (repositorio s0k1x/aurevixweb, `style.css`). Si cambias el nombre, cámbialo también en
 * `apps/mobile/app.config.ts` y en `app_config.platform_name` desde el panel de administración.
 */
export const BRAND = {
  name: 'Aurevix Music',
  shortName: 'Aurevix',
  tagline: 'Escucha, descubre y comparte música independiente.',
  description:
    'Aurevix Music es una plataforma musical para escuchar tus canciones favoritas, crear playlists y descubrir artistas independientes que publican su propia música.',
  supportEmail: 'aurevixweb@gmail.com',
  legalEntity: 'Titular de Aurevix Music (pendiente de completar)',
  colors: {
    background: '#0C0C0E',
    surface: '#16161B',
    surfaceElevated: '#1D1D24',
    field: '#0F0F12',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.16)',
    text: '#F3F1EA',
    textMuted: '#A19F96',
    textSubtle: '#86837C',
    /** Acento principal: lima de Aurevix. El texto sobre él va en `onAccent`. */
    accent: '#C8F560',
    accentStrong: '#C8F560',
    accentHover: '#D8FF80',
    /** Acento secundario: violeta de Aurevix (me gusta, detalles). */
    accentWarm: '#B98CFF',
    onAccent: '#0C0C0E',
    success: '#4ADE80',
    warning: '#FBBF24',
    info: '#60A5FA',
    danger: '#F87171',
  },
  /** Degradado sutil para fondos de cabecera (no para botones: los botones son lima sólido). */
  gradient: ['#C8F560', '#8FB83A'] as const,
  fonts: {
    display: 'Bricolage Grotesque',
    body: 'Instrument Sans',
    mono: 'JetBrains Mono',
  },
} as const;

export type BrandColors = typeof BRAND.colors;
