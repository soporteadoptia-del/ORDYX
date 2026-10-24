import { passwordSchema } from '@ordyx/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Text, TextField } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import { AuthShell } from '@/components/AuthShell';

/** Destino del enlace de recuperación: la sesión temporal se establece desde el deep link. */
export default function ResetPassword() {
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Contraseña no válida');
    setLoading(true);
    const { error: e } = await supabase.auth.updateUser({ password: parsed.data });
    setLoading(false);
    if (e) return setError(toUserMessage(e));
    router.replace('/');
  }

  if (!session) {
    return (
      <AuthShell title="Enlace no válido" subtitle="El enlace ha caducado o ya se ha usado. Solicita uno nuevo desde «¿Has olvidado tu contraseña?».">
        <Button label="Volver" onPress={() => router.replace('/sign-in')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nueva contraseña">
      <TextField label="Contraseña nueva" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button label="Guardar contraseña" onPress={submit} loading={loading} />
    </AuthShell>
  );
}
