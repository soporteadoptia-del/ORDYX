import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/** Cliente anónimo de servidor: solo accede a lo que las políticas RLS permiten al rol `anon`. */
export function anonClient() {
  return createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
