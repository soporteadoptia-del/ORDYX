/**
 * Traduce errores de Supabase/PostgREST/Auth a mensajes comprensibles en español.
 * Las funciones SQL lanzan errores con prefijos `ordyx:` que se mapean aquí.
 */
const CODE_MESSAGES: Record<string, string> = {
  '23505': 'Ese valor ya está en uso.',
  '23503': 'El elemento relacionado ya no existe.',
  '23514': 'Algún dato no cumple los requisitos.',
  '42501': 'No tienes permiso para realizar esta acción.',
  PGRST116: 'No se ha encontrado el elemento.',
  P0001: 'No se ha podido completar la operación.',
};

const APP_MESSAGES: Record<string, string> = {
  rate_limited: 'Estás haciendo esto demasiado rápido. Espera un momento e inténtalo de nuevo.',
  not_allowed: 'No tienes permiso para realizar esta acción.',
  account_suspended: 'Tu cuenta está suspendida. Contacta con soporte.',
  not_found: 'No se ha encontrado el elemento.',
  audio_missing: 'El archivo de audio todavía no se ha subido correctamente.',
  rights_required: 'Debes confirmar que tienes los derechos de publicación.',
  invalid_state: 'Esta acción no está disponible en el estado actual.',
  blocked: 'No puedes interactuar con este usuario.',
  admin_exists: 'Ya existe un administrador.',
  invalid_input: 'Algún dato no es válido.',
};

const AUTH_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo electrónico antes de iniciar sesión.',
  'User already registered': 'Ya existe una cuenta con ese correo.',
};

export interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

export function toUserMessage(error: unknown): string {
  if (!error) return 'Ha ocurrido un error inesperado.';
  const e = error as ErrorLike;
  const message = e.message ?? String(error);
  const appCode = /ordyx:([a-z_]+)/.exec(message)?.[1];
  const appMessage = appCode ? APP_MESSAGES[appCode] : undefined;
  if (appMessage) return appMessage;
  const authMessage = AUTH_MESSAGES[message];
  if (authMessage) return authMessage;
  const codeMessage = e.code ? CODE_MESSAGES[e.code] : undefined;
  if (codeMessage) return codeMessage;
  if (/network|fetch failed|Failed to fetch|Network request failed/i.test(message)) {
    return 'Sin conexión. Comprueba tu red e inténtalo de nuevo.';
  }
  if (/rate limit/i.test(message)) return APP_MESSAGES.rate_limited!;
  return 'Ha ocurrido un error. Inténtalo de nuevo.';
}
