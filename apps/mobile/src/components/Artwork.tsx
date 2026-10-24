import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

/** Portada con degradado de respaldo cuando la canción/playlist no tiene imagen. */
export function Artwork({
  uri,
  size,
  rounded = false,
  icon = 'musical-notes',
  seed = '',
  style,
}: {
  uri: string | null;
  size: number;
  rounded?: boolean;
  icon?: 'musical-notes' | 'person' | 'list' | 'disc';
  seed?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const r = rounded ? size / 2 : Math.max(6, Math.round(size * 0.08));
  const hue = [...seed].reduce((a, c) => (a + c.charCodeAt(0)) % 360, 260);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          overflow: 'hidden',
          backgroundColor: colors.surfaceElevated,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          recyclingKey={uri}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <LinearGradient
          colors={[`hsl(${hue}, 70%, 42%)`, `hsl(${(hue + 60) % 360}, 75%, 30%)`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        >
          <Ionicons name={icon} size={size * 0.38} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      )}
    </View>
  );
}

export const artworkStyles = StyleSheet.create({ round: { borderRadius: radius.pill } });
