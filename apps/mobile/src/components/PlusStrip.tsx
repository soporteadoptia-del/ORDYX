import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { PressableScale } from './motion';
import { Text } from './ui';

export function PlusStrip({ price }: { price: string }) {
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push('/plus')}
      accessibilityRole="button"
      accessibilityLabel={`Aurevix Premium, ${price} al mes`}
      style={styles.plus}
    >
      <Ionicons name="sparkles" size={20} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">Aurevix Premium</Text>
        <Text variant="caption" muted numberOfLines={2}>
          Sonido original, descargas, letras y tus estadísticas por {price} al mes.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,245,96,0.3)',
    backgroundColor: 'rgba(200,245,96,0.06)',
  },
});
