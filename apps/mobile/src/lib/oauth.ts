import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Dirección a la que Supabase devuelve al usuario tras Google: aurevix://auth-callback */
export const oauthRedirectUrl = () => Linking.createURL('auth-callback');

/** Lee los tokens que Supabase añade a la URL de vuelta (#access_token=…&refresh_token=…). */
export function sessionTokensFromUrl(url: string) {
  const query = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const params = new URLSearchParams(query);
  const error = params.get('error_description') ?? params.get('error');
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  return { error, tokens: access_token && refresh_token ? { access_token, refresh_token } : null };
}

/**
 * Inicio de sesión con Google a través de Supabase Auth: abre el navegador del sistema (no un
 * WebView, que Google bloquea) y recoge la sesión al volver a la app. Devuelve false si el usuario
 * cierra el navegador sin terminar.
 */
export async function signInWithGoogle(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // App web: redirección normal; al volver, Supabase lee la sesión de la URL.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: Linking.createURL('/') },
    });
    if (error) throw error;
    return false;
  }
  const redirectTo = oauthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  const { error: callbackError, tokens } = sessionTokensFromUrl(result.url);
  if (callbackError) throw new Error(callbackError);
  if (!tokens) throw new Error('Google no ha devuelto una sesión válida.');
  const { error: sessionError } = await supabase.auth.setSession(tokens);
  if (sessionError) throw sessionError;
  return true;
}

export const appleSignInAvailable = () =>
  Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false);

/**
 * Inicio de sesión con Apple nativo (solo iOS). Apple firma un token de identidad con un nonce
 * cifrado; Supabase lo comprueba con el nonce original. Apple solo envía el nombre la primera vez,
 * así que se copia al perfil en ese momento.
 */
export async function signInWithApple(): Promise<boolean> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple no ha devuelto un token de identidad.');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .slice(0, 60);
  if (fullName && data.user) {
    // El perfil ya se ha creado sin nombre; solo se rellena si sigue vacío.
    await supabase
      .from('profiles')
      .update({ display_name: fullName })
      .eq('id', data.user.id)
      .is('display_name', null);
  }
  return true;
}
