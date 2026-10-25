import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Contenedor de pantalla con fondo de marca y márgenes seguros superiores. */
export function Screen({
  children,
  edges = ['top'],
  style,
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom')[];
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          // El fondo de marca lo pone el layout (BrandBackground).
          backgroundColor: 'transparent',
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Espacio al final de las listas. La barra de pestañas y el mini reproductor no se superponen al
 * contenido (van debajo, fuera de la pantalla de la pestaña), así que basta con un margen.
 */
export const LIST_BOTTOM_PADDING = 40;
