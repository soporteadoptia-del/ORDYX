import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

/** Fondo de marca (brillos lima y violeta con rejilla de puntos), el mismo que la web. */
export function BrandBackground() {
  return (
    <Image
      source={require('../../assets/brand/background.jpg')}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      pointerEvents="none"
      accessible={false}
    />
  );
}
