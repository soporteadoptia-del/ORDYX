import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuración nativa de la app. Los identificadores y el nombre son configurables por variables
 * de entorno para poder cambiar la marca provisional sin tocar código:
 *   APP_NAME, APP_SLUG, APP_SCHEME, IOS_BUNDLE_ID, ANDROID_PACKAGE, EAS_PROJECT_ID
 * APP_VARIANT=development|preview|production añade sufijos para instalar varias versiones a la vez.
 * Aquí NO van secretos: todo lo que se define en `extra` o con EXPO_PUBLIC_ acaba dentro del binario.
 */
const variant = process.env.APP_VARIANT ?? 'production';
const suffix = variant === 'production' ? '' : `.${variant}`;
const nameSuffix = variant === 'production' ? '' : variant === 'preview' ? ' (Beta)' : ' (Dev)';

const appName = process.env.APP_NAME ?? 'Ordyx';
const bundleId = (process.env.IOS_BUNDLE_ID ?? 'app.ordyx.music') + suffix;
const androidPackage = (process.env.ANDROID_PACKAGE ?? 'app.ordyx.music') + suffix;
const scheme = process.env.APP_SCHEME ?? 'ordyx';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName + nameSuffix,
  slug: process.env.APP_SLUG ?? 'ordyx',
  // Versión visible del binario. Debe coincidir con la publicada en app_versions.
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/brand/icon.png',
  scheme,
  userInterfaceStyle: 'dark',
  backgroundColor: '#07070B',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
    icon: './assets/brand/icon.png',
    infoPlist: {
      // Reproducción en segundo plano (expo-audio también lo añade con enableBackgroundPlayback).
      UIBackgroundModes: ['audio'],
      NSPhotoLibraryUsageDescription:
        'Ordyx usa tu fototeca solo para elegir portadas y fotos de perfil.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: androidPackage,
    adaptiveIcon: {
      foregroundImage: './assets/brand/adaptive-foreground.png',
      monochromeImage: './assets/brand/adaptive-monochrome.png',
      backgroundColor: '#14101F',
    },
    predictiveBackGestureEnabled: false,
    // Permisos mínimos: sin micrófono ni ubicación.
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  web: { output: 'single', favicon: './assets/brand/favicon.png' },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: '#07070B', image: './assets/brand/splash.png', imageWidth: 160 },
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
    [
      'expo-image-picker',
      {
        photosPermission: 'Ordyx usa tu fototeca solo para elegir portadas y fotos de perfil.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  runtimeVersion: { policy: 'appVersion' },
  updates: process.env.EAS_PROJECT_ID
    ? { url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}` }
    : undefined,
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
    variant,
  },
});
