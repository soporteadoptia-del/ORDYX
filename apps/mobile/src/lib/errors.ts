import { toUserMessage } from '@ordyx/shared';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export { toUserMessage };

/** Registra un error relevante en el servidor (sin datos sensibles) para el panel de administración. */
export function reportError(
  error: unknown,
  context: Record<string, string | number | boolean | null> = {},
) {
  const message = error instanceof Error ? error.message : String(error);
  if (__DEV__) console.warn('[aurevix]', message, context);
  supabase
    .rpc('log_client_error', {
      p_app: 'mobile',
      p_app_version: Constants.expoConfig?.version ?? 'dev',
      p_platform: Platform.OS,
      p_message: message.slice(0, 1000),
      p_context: context,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
