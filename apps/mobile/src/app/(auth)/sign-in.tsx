import { firstError, signInSchema } from '@ordyx/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { AuthShell } from '@/components/AuthShell';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return setError(firstError(parsed.error));
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (authError) setError(toUserMessage(authError));
  }

  return (
    <AuthShell
      title="Inicia sesión"
      subtitle="Tu música y tus playlists, en todos tus dispositivos."
    >
      <TextField
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      {error ? (
        <Text style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Entrar" onPress={submit} loading={loading} />
      <Link href="/forgot-password" style={{ alignSelf: 'center' }}>
        <Text style={{ color: colors.accentStrong }}>¿Has olvidado tu contraseña?</Text>
      </Link>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text muted>¿No tienes cuenta?</Text>
        <Link href="/sign-up">
          <Text style={{ color: colors.accentStrong, fontWeight: '600' }}>Regístrate</Text>
        </Link>
      </View>
    </AuthShell>
  );
}
