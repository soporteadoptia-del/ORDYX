import { BRAND } from '@ordyx/shared';

export const colors = {
  ...BRAND.colors,
  overlay: 'rgba(7,7,11,0.72)',
  glass: 'rgba(26,26,36,0.92)',
  accentSoft: 'rgba(139,92,246,0.16)',
};

export const gradient = BRAND.gradient;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 28, pill: 999 } as const;

export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};

/** Altura reservada por el mini reproductor + barra de pestañas, para que el contenido no quede oculto. */
export const MINI_PLAYER_HEIGHT = 64;
