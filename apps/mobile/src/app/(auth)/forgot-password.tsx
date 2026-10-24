import { emailSchema } from '@ordyx/shared';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Button, Text, TextField } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { AuthShell } from '@/components/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError('Correo electrónico no válido');
    setLoading(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: Linking.createURL('/reset-password'),
    });
    setLoading(false);
    // Por privacidad, se muestra el mismo mensaje exista o no la cuenta.
    if (e && !/rate limit/i.test(e.message)) return setError(toUserMessage(e));
    setSent(true);
  }

  return (
    <AuthShell
      title="Recupera tu contraseña"
      subtitle={sent ? 'Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña nueva. Ábrelo en este dispositivo.' : 'Te enviaremos un enlace para restablecerla.'}
    >
      {!sent ? (
        <>
          <TextField label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Button label="Enviar enlace" onPress={submit} loading={loading} />
        </>
      ) : null}
      <Link href="/sign-in" style={{ alignSelf: 'center' }}>
        <Text style={{ color: colors.accentStrong }}>Volver a iniciar sesión</Text>
      </Link>
    </AuthShell>
  );
}
