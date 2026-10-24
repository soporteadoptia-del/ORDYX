import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { gradient } from '@/theme';

/**
 * Isotipo de Ordyx: un anillo (la "O" y un disco) con una onda de sonido en el centro, sobre el
 * degradado de marca. Es la misma geometría que el icono de la app (apps/mobile/assets/brand/logo.svg).
 */
export function Logo({ size = 48 }: { size?: number }) {
  const ring = size * 0.56;
  const bar = size * 0.07;
  const heights = [0.18, 0.32, 0.22];
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.26, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Logotipo de Ordyx"
    >
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: size * 0.075,
          borderColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: bar * 0.7,
        }}
      >
        {heights.map((h, i) => (
          <View key={i} style={{ width: bar, height: size * h, borderRadius: bar / 2, backgroundColor: '#fff' }} />
        ))}
      </View>
    </LinearGradient>
  );
}
