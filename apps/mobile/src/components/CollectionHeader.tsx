import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { Text } from './ui';

/** Cabecera común de playlist, álbum, artista y favoritos con acciones de reproducción. */
export function CollectionHeader({
  image,
  seed,
  icon,
  round,
  kicker,
  title,
  subtitle,
  description,
  onPlay,
  onShuffle,
  actions,
  playDisabled,
}: {
  image: string | null;
  seed: string;
  icon?: 'musical-notes' | 'person' | 'list' | 'disc';
  round?: boolean;
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  description?: string | null;
  onPlay?: () => void;
  onShuffle?: () => void;
  actions?: ReactNode;
  playDisabled?: boolean;
}) {
  return (
    <View>
      <LinearGradient colors={['rgba(139,92,246,0.35)', colors.background]} style={StyleSheet.absoluteFill} />
      <View style={styles.hero}>
        <Artwork uri={image} size={200} rounded={round} icon={icon} seed={seed} />
        {kicker ? (
          <Text variant="micro" muted>
            {kicker.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="display" style={{ textAlign: 'center' }} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <Text muted style={{ textAlign: 'center' }}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
        {description ? (
          <Text muted variant="caption" style={{ textAlign: 'center' }}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <View style={styles.extra}>{actions}</View>
        {onShuffle ? (
          <Pressable onPress={onShuffle} disabled={playDisabled} accessibilityRole="button" accessibilityLabel="Reproducir en orden aleatorio" style={styles.round}>
            <Ionicons name="shuffle" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        {onPlay ? (
          <Pressable onPress={onPlay} disabled={playDisabled} accessibilityRole="button" accessibilityLabel="Reproducir" style={[styles.play, playDisabled && { opacity: 0.4 }]}>
            <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.playFill}>
              <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  extra: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  play: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  playFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
