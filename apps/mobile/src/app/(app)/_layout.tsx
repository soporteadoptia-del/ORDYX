import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="queue" options={{ presentation: 'modal', title: 'Cola de reproducción' }} />
      <Stack.Screen name="report" options={{ presentation: 'modal', title: 'Denunciar' }} />
      <Stack.Screen name="playlist/new" options={{ presentation: 'modal', title: 'Nueva playlist' }} />
      <Stack.Screen name="playlist/edit/[id]" options={{ presentation: 'modal', title: 'Editar playlist' }} />
      <Stack.Screen name="profile-edit" options={{ presentation: 'modal', title: 'Editar perfil' }} />
    </Stack>
  );
}
