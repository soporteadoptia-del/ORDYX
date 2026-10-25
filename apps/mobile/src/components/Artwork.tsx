import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

/** Degradados de respaldo con la paleta de Aurevix (lima, violeta, grafito, azul). */
const ART_TONES: { colors: [string, string]; icon: string }[] = [
  { colors: ['#C8F560', '#8FB83A'], icon: 'rgba(12,12,14,0.8)' },
  { colors: ['#B98CFF', '#7B5BD6'], icon: 'rgba(12,12,14,0.8)' },
  { colors: ['#2A2A33', '#16161B'], icon: '#C8F560' },
  { colors: ['#60A5FA', '#3B6FD1'], icon: 'rgba(12,12,14,0.8)' },
];

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
  const tone = ART_TONES[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % ART_TONES.length];
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
          colors={tone.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        >
          <Ionicons name={icon} size={size * 0.38} color={tone.icon} />
        </LinearGradient>
      )}
    </View>
  );
}

export const artworkStyles = StyleSheet.create({ round: { borderRadius: radius.pill } });
