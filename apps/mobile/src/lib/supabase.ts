import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { env } from './env';
import { sessionStorage } from './secure-storage';

export const supabase = createClient(
  env.supabaseUrl || 'http://localhost',
  env.supabaseKey || 'missing',
  {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      // En la app web (/app) la vuelta de Google llega a la propia página con la sesión en la URL.
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

// Refresca el token solo con la app en primer plano (recomendación de Supabase para apps móviles).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
