import { BRAND } from '@ordyx/shared';

export const colors = {
  ...BRAND.colors,
  overlay: 'rgba(12,12,14,0.72)',
  glass: 'rgba(22,22,27,0.94)',
  accentSoft: 'rgba(200,245,96,0.12)',
  /** Brillo lima muy suave para fondos de cabecera (como `--accent-soft` de la web). */
  accentGlow: 'rgba(200,245,96,0.16)',
};

export const gradient = BRAND.gradient;

/**
 * Familias tipográficas de Aurevix (las mismas que aurevixweb.es). Se cargan en `app/_layout.tsx`
 * con expo-font; las claves de aquí son los nombres con los que se registran.
 * Con fuentes personalizadas no se usa `fontWeight`: cada peso es una familia distinta.
 */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodyStrong: 'InstrumentSans_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 28, pill: 999 } as const;

export const type = {
  display: { fontSize: 30, fontFamily: fonts.displayHeavy, letterSpacing: -0.9 },
  title: { fontSize: 22, fontFamily: fonts.display, letterSpacing: -0.4 },
  heading: { fontSize: 18, fontFamily: fonts.display, letterSpacing: -0.2 },
  body: { fontSize: 15, fontFamily: fonts.body },
  bodyStrong: { fontSize: 15, fontFamily: fonts.bodyStrong },
  caption: { fontSize: 13, fontFamily: fonts.body },
  /** Etiqueta "eyebrow" en mono y mayúsculas, como en la web. */
  micro: { fontSize: 11, fontFamily: fonts.mono, letterSpacing: 0.9 },
};

/** Altura reservada por el mini reproductor + barra de pestañas, para que el contenido no quede oculto. */
export const MINI_PLAYER_HEIGHT = 64;
