import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans/600SemiBold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/Toast';
import { TrackActionsProvider } from '@/components/TrackActions';
import { ErrorState, Text } from '@/components/ui';
import { env } from '@/lib/env';
import { sessionTokensFromUrl } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { usePlus } from '@/hooks/usePlus';
import { restoreDownloads, setPlusUntil } from '@/player/downloads';
import { restorePlayerPrefs } from '@/player/prefs';
import { restorePlayer } from '@/player/store';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Reintentos controlados: 2 veces, salvo errores de permisos o de "no encontrado".
      retry: (count, error) =>
        count < 2 &&
        !/42501|PGRST116|not_allowed|not_found/.test(
          String((error as { code?: string })?.code ?? error),
        ),
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
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accentStrong,
  },
};

/**
 * Procesa los enlaces con sesión: recuperación de contraseña (aurevix://reset-password#access_token=…)
 * y la vuelta de Google (aurevix://auth-callback#access_token=…) cuando el sistema abre la app con ella.
 */
function useAuthDeepLinks() {
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url || !url.includes('access_token')) return;
    const { tokens } = sessionTokensFromUrl(url);
    if (tokens) void supabase.auth.setSession(tokens);
  }, [url]);
}

function RootNavigator() {
  const { session, initializing, termsAccepted } = useAuth();
  // Fuentes de aurevixweb.es. Si fallan, la app sigue con la fuente del sistema.
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: BricolageGrotesque_700Bold,
    [fonts.displayHeavy]: BricolageGrotesque_800ExtraBold,
    [fonts.body]: InstrumentSans_400Regular,
    [fonts.bodyMedium]: InstrumentSans_500Medium,
    [fonts.bodyStrong]: InstrumentSans_600SemiBold,
    [fonts.mono]: JetBrainsMono_500Medium,
  });
  const ready = !initializing && (fontsLoaded || !!fontError);
  useAuthDeepLinks();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (!session) return;
    void restorePlayerPrefs();
    void restoreDownloads();
    void restorePlayer();
  }, [session]);

  // El estado de Plus se guarda en el dispositivo para que las descargas sigan sonando sin conexión.
  const plus = usePlus();
  useEffect(() => {
    if (plus.data) setPlusUntil(plus.data.active ? plus.data.expires_at : null);
  }, [plus.data]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={!!session && termsAccepted !== false}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && termsAccepted === false}>
        <Stack.Screen name="accept-terms" />
      </Stack.Protected>
      {/* Sin sesión: la primera pantalla disponible es el inicio de sesión. */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="sign-up" options={{ animation: 'fade' }} />
        <Stack.Screen name="forgot-password" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Screen name="reset-password" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth-callback" />
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navTheme}>
          <WebInsets>
            <ToastProvider>
              <AuthProvider>
                <TrackActionsProvider>
                  <StatusBar style="light" />
                  <RootNavigator />
                </TrackActionsProvider>
              </AuthProvider>
            </ToastProvider>
          </WebInsets>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * En la web los márgenes de la muesca y de la barra de inicio los pone el CSS de la página (ver
 * scripts/build-web-app.mjs), que en el iPhone es más fiable; la app no los vuelve a sumar.
 */
const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
function WebInsets({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <SafeAreaInsetsContext.Provider value={ZERO_INSETS}>{children}</SafeAreaInsetsContext.Provider>
  );
}
