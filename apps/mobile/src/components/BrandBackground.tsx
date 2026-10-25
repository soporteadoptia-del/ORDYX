import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

/**
 * Fondo de marca (brillos lima y violeta con rejilla de puntos), el mismo que la web. Arriba se
 * funde con el color de fondo para que no haya un corte bajo la cabecera de las pantallas.
 */
export function BrandBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={require('../../assets/brand/background.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessible={false}
      />
      {/* Arriba, color liso: bajo la barra de estado y la cabecera el brillo se veía borroso. */}
      <LinearGradient
        colors={[colors.background, colors.background, `${colors.background}00`]}
        locations={[0, 0.5, 1]}
        style={styles.fade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, top: 0, height: 300 },
});
