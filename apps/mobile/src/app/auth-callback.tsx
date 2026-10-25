import { Redirect } from 'expo-router';

/**
 * Destino de aurevix://auth-callback (vuelta de Google). La sesión la recoge `signInWithGoogle` o,
 * si el sistema abre la app con el enlace, `useAuthDeepLinks`; aquí solo se vuelve al inicio.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
