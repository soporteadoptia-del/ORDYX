import { BRAND } from '@ordyx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['rgba(139,92,246,0.35)', 'rgba(236,72,153,0.08)', 'transparent']}
        style={styles.glow}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Logo size={56} />
          <Text variant="display">{BRAND.name}</Text>
        </View>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text muted>{subtitle}</Text> : null}
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl },
});
