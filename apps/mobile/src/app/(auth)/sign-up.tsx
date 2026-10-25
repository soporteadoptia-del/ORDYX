import { firstError, signUpSchema } from '@ordyx/shared';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { env } from '@/lib/env';
import { toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing } from '@/theme';
import { AuthShell } from '@/components/AuthShell';
import { SocialSignIn } from '@/components/SocialSignIn';

export default function SignUp() {
  const [form, setForm] = useState({ email: '', password: '', username: '', acceptTerms: false });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) return setError(firstError(parsed.error));
    setError(null);
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        // El servidor valida y reserva el nombre; si está ocupado asigna uno provisional editable.
        data: { username: parsed.data.username, accept_terms: true },
        emailRedirectTo: `${env.webUrl}/cuenta-confirmada`,
      },
    });
    setLoading(false);
    if (authError) return setError(toUserMessage(authError));
    // Si el proyecto exige verificar el correo, no hay sesión hasta que el usuario confirme.
    if (!data.session) setDone(true);
  }

  if (done) {
    return (
      <AuthShell
        title="Revisa tu correo"
        subtitle={`Te hemos enviado un enlace de confirmación a ${form.email}. Ábrelo y después inicia sesión.`}
      >
        <Link href="/sign-in" asChild>
          <Button label="Ir a iniciar sesión" />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Gratis. Sin tarjeta.">
      <TextField
        label="Nombre de usuario"
        value={form.username}
        onChangeText={set('username')}
        autoCapitalize="none"
        autoComplete="username"
        placeholder="tu_nombre"
      />
      <TextField
        label="Correo electrónico"
        value={form.email}
        onChangeText={set('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Contraseña (mín. 8, con letras y números)"
        value={form.password}
        onChangeText={set('password')}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Switch
          value={form.acceptTerms}
          onValueChange={set('acceptTerms')}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel="Acepto las condiciones de uso y la política de privacidad"
        />
        <Text variant="caption" style={{ flex: 1 }}>
          Acepto las{' '}
          <Text
            variant="caption"
            style={{ color: colors.accentStrong }}
            onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/condiciones`)}
          >
            condiciones de uso
          </Text>{' '}
          y la{' '}
          <Text
            variant="caption"
            style={{ color: colors.accentStrong }}
            onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/privacidad`)}
          >
            política de privacidad
          </Text>
          .
        </Text>
      </View>
      {error ? (
        <Text style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Crear cuenta" onPress={submit} loading={loading} />
      <SocialSignIn onError={setError} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text muted>¿Ya tienes cuenta?</Text>
        <Link href="/sign-in" asChild>
          <Pressable>
            <Text style={{ color: colors.accentStrong, fontFamily: fonts.bodyStrong }}>
              Inicia sesión
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}
