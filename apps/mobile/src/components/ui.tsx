import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { colors, gradient, radius, spacing, type } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = keyof typeof type;
export function Text({ variant = 'body', muted, style, ...rest }: TextProps & { variant?: Variant; muted?: boolean }) {
  return <RNText {...rest} style={[type[variant], { color: muted ? colors.textMuted : colors.text }, style]} />;
}

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function Button({ label, icon, variant = 'primary', loading, disabled, style, compact, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  const content = (
    <View style={[styles.buttonInner, compact && styles.buttonCompact]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={variant === 'danger' ? colors.danger : colors.text} /> : null}
          <Text variant="bodyStrong" style={variant === 'danger' ? { color: colors.danger } : undefined}>
            {label}
          </Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        { opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientFill}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  label,
  size = 24,
  color = colors.text,
  onPress,
  disabled,
  style,
}: {
  name: IconName;
  label: string;
  size?: number;
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }, style]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function TextField({ label, error, style, ...rest }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={label}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" style={{ color: colors.danger }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text variant="caption" style={{ color: selected ? '#fff' : colors.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={colors.accentStrong} size="large" />
    </View>
  );
}

export function EmptyState({ icon = 'musical-notes-outline', title, message, action }: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      <Ionicons name={icon} size={40} color={colors.textSubtle} />
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text muted style={{ textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={40} color={colors.danger} />
      <Text variant="heading" style={{ textAlign: 'center' }}>
        Algo ha fallado
      </Text>
      <Text muted style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {onRetry ? <Button label="Reintentar" icon="refresh" variant="secondary" onPress={onRetry} compact /> : null}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text variant="caption" style={{ color: colors.accentStrong, fontWeight: '600' }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'warning' | 'success' | 'danger' | 'muted' }) {
  const color = { accent: colors.accentStrong, warning: colors.warning, success: colors.success, danger: colors.danger, muted: colors.textMuted }[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text variant="micro" style={{ color }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  button: { borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.accent, minHeight: 48 },
  buttonSecondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  gradientFill: { flex: 1, borderRadius: radius.pill },
  buttonInner: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: spacing.lg },
  iconButton: { padding: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  state: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
});
