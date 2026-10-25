import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { colors, fonts } from '@/theme';

/** Logotipo «A» de Aurevix (el mismo de aurevixweb.es), en lima sobre transparente. */
export function Logo({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/brand/logo.png')}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Logotipo de Aurevix Music"
    />
  );
}

/** Logotipo + nombre: «AUREVIX» en crema y «MUSIC» en lima, como el «AUREVIXWEB» de la web. */
export function Wordmark({ size = 22 }: { size?: number }) {
  const word = { fontFamily: fonts.displayHeavy, fontSize: size, letterSpacing: size * 0.02 };
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.5 }}
      accessible
      accessibilityRole="header"
      accessibilityLabel="Aurevix Music"
    >
      <Logo size={size * 1.6} />
      <Text style={[word, { color: colors.text }]}>
        AUREVIX<Text style={{ color: colors.accent }}>MUSIC</Text>
      </Text>
    </View>
  );
}
