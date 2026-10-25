import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { appleSignInAvailable, signInWithApple, signInWithGoogle } from '@/lib/oauth';
import { colors, radius, spacing } from '@/theme';

/** Botones «Continuar con Google» y, en iPhone, «Iniciar sesión con Apple». */
export function SocialSignIn({ onError }: { onError: (message: string | null) => void }) {
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [apple, setApple] = useState(false);

  useEffect(() => {
    appleSignInAvailable().then(setApple, () => setApple(false));
  }, []);

  async function run(provider: 'google' | 'apple') {
    onError(null);
    setBusy(provider);
    try {
      await (provider === 'google' ? signInWithGoogle() : signInWithApple());
    } catch (e) {
      onError(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.divider} accessibilityElementsHidden>
        <View style={styles.line} />
        <Text variant="micro" muted>
          o continúa con
        </Text>
        <View style={styles.line} />
      </View>
      <Button
        variant="google"
        icon="logo-google"
        label="Continuar con Google"
        loading={busy === 'google'}
        disabled={busy !== null}
        onPress={() => run('google')}
      />
      {apple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
          cornerRadius={radius.pill}
          style={{ height: 50, opacity: busy ? 0.5 : 1 }}
          onPress={() => busy === null && run('apple')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
});
