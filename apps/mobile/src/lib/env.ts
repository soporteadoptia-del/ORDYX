/**
 * Configuración pública del cliente. Solo se admiten valores PÚBLICOS: la URL del proyecto y la
 * clave publicable (anon). La clave service_role nunca debe llegar a la app.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const env = {
  supabaseUrl: url ?? '',
  supabaseKey: key ?? '',
  webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'https://ordyx.vercel.app',
  isConfigured: Boolean(url && key),
};

if (key && /service_role|sb_secret_/.test(key)) {
  throw new Error('Se ha configurado una clave secreta en la app. Usa solo la clave publicable.');
}
