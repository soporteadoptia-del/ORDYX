import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuración nativa de la app. Los identificadores y el nombre son configurables por variables
 * de entorno para poder cambiarlos sin tocar código:
 *   APP_NAME, APP_SLUG, APP_SCHEME, IOS_BUNDLE_ID, ANDROID_PACKAGE, EAS_PROJECT_ID
 * APP_VARIANT=development|preview|production añade sufijos para instalar varias versiones a la vez.
 * Aquí NO van secretos: todo lo que se define en `extra` o con EXPO_PUBLIC_ acaba dentro del binario.
 */
const variant = process.env.APP_VARIANT ?? 'production';
const suffix = variant === 'production' ? '' : `.${variant}`;
const nameSuffix = variant === 'production' ? '' : variant === 'preview' ? ' (Beta)' : ' (Dev)';

const appName = process.env.APP_NAME ?? 'Aurevix Music';
const bundleId = (process.env.IOS_BUNDLE_ID ?? 'es.aurevixweb.music') + suffix;
const androidPackage = (process.env.ANDROID_PACKAGE ?? 'es.aurevixweb.music') + suffix;
const scheme = process.env.APP_SCHEME ?? 'aurevix';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName + nameSuffix,
  slug: process.env.APP_SLUG ?? 'aurevix-music',
  // Versión visible del binario. Debe coincidir con la publicada en app_versions.
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/brand/icon.png',
  scheme,
  userInterfaceStyle: 'dark',
  backgroundColor: '#0C0C0E',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
    // Inicio de sesión con Apple (obligatorio en iOS si se ofrece Google: App Store 4.8).
    usesAppleSignIn: true,
    icon: './assets/brand/icon.png',
    infoPlist: {
      // Reproducción en segundo plano (expo-audio también lo añade con enableBackgroundPlayback).
      UIBackgroundModes: ['audio'],
      NSPhotoLibraryUsageDescription:
        'Aurevix Music usa tu fototeca solo para elegir portadas y fotos de perfil.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: androidPackage,
    // Número de compilación: lo fija el workflow de GitHub Actions (debe subir en cada versión).
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
    adaptiveIcon: {
      foregroundImage: './assets/brand/adaptive-foreground.png',
      monochromeImage: './assets/brand/adaptive-monochrome.png',
      backgroundColor: '#0C0C0E',
    },
    predictiveBackGestureEnabled: false,
    // Permisos mínimos: sin micrófono ni ubicación.
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  web: {
    output: 'single',
    favicon: './assets/brand/favicon.png',
    name: 'Aurevix Music',
    shortName: 'Aurevix',
    themeColor: '#0C0C0E',
    backgroundColor: '#0C0C0E',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: '#0C0C0E', image: './assets/brand/splash.png', imageWidth: 160 },
    ],
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: true,
      },
    ],
    'expo-secure-store',
    'expo-web-browser',
    'expo-apple-authentication',
    'expo-font',
    [
      'expo-image-picker',
      {
        photosPermission: 'Aurevix Music usa tu fototeca solo para elegir portadas y fotos de perfil.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    // Solo para la exportación web servida en https://<web>/app (scripts/build-web-app.mjs).
    baseUrl: process.env.EXPO_WEB_BASE_URL,
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: process.env.EAS_PROJECT_ID
    ? { url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}` }
    : undefined,
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
    variant,
  },
});
