import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/Toast';
import { TrackActionsProvider } from '@/components/TrackActions';
import { ErrorState, Text } from '@/components/ui';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { restorePlayer } from '@/player/store';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Reintentos controlados: 2 veces, salvo errores de permisos o de "no encontrado".
      retry: (count, error) => count < 2 && !/42501|PGRST116|not_allowed|not_found/.test(String((error as { code?: string })?.code ?? error)),
    },
  },
});

// react-query se pausa sin conexión y refresca al volver a primer plano.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
}
onlineManager.setOnline(true);

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accentStrong },
};

/** Procesa los enlaces de recuperación de contraseña: ordyx://reset-password#access_token=…&refresh_token=… */
function useAuthDeepLinks() {
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url || !url.includes('access_token')) return;
    const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      void supabase.auth.setSession({ access_token, refresh_token });
    }
  }, [url]);
}

function RootNavigator() {
  const { session, initializing } = useAuth();
  useAuthDeepLinks();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync().catch(() => undefined);
  }, [initializing]);

  useEffect(() => {
    if (session) void restorePlayer();
  }, [session]);

  if (initializing) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="reset-password" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  if (!env.isConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ErrorState message="Falta la configuración de Supabase. Define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example)." />
        <Text muted style={{ textAlign: 'center' }}>
          La app no incluye ninguna clave secreta.
        </Text>
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navTheme}>
          <ToastProvider>
            <AuthProvider>
              <TrackActionsProvider>
                <StatusBar style="light" />
                <RootNavigator />
              </TrackActionsProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
