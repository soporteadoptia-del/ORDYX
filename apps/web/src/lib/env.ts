export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ordyx.app').replace(/\/$/, ''),
};
export const isConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
