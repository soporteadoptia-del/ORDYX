import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { AuthShell } from '@/components/AuthShell';
import { Button, Text } from '@/components/ui';
import { acceptTerms } from '@/api/me';
import { env } from '@/lib/env';
import { toUserMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

/**
 * Las cuentas creadas con Google o Apple no pasan por el formulario de registro: antes de usar la
 * app aceptan aquí las condiciones y la política de privacidad (queda registrada la fecha).
 */
export default function AcceptTerms() {
  const { refreshProfile, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setError(null);
    setLoading(true);
    try {
      await acceptTerms();
      refreshProfile();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Un último paso"
      subtitle="Para usar Aurevix Music necesitamos que aceptes las condiciones de uso y la política de privacidad."
    >
      <Button
        variant="secondary"
        icon="document-text-outline"
        label="Leer las condiciones de uso"
        onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/condiciones`)}
      />
      <Button
        variant="secondary"
        icon="shield-checkmark-outline"
        label="Leer la política de privacidad"
        onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/privacidad`)}
      />
      {error ? (
        <Text style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Acepto y continúo" onPress={accept} loading={loading} />
      <Button variant="ghost" label="Ahora no (cerrar sesión)" onPress={() => signOut()} />
    </AuthShell>
  );
}
