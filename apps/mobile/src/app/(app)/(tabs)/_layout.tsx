import { Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { BrandBackground } from '@/components/BrandBackground';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      // Cada pestaña lleva su propio fondo opaco: las inactivas siguen montadas (sobre todo en la
      // web) y, con fondo transparente, se veían unas encima de otras.
      screenLayout={({ children }) => (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <BrandBackground />
          {children}
        </View>
      )}
      // Barra propia con el botón central «Ahora» (ver TabBar).
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Las pestañas son pares: se cambia sin animación.
        animation: 'none',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="search" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="library" options={{ title: 'Biblioteca' }} />
      <Tabs.Screen name="me" options={{ title: 'Tú' }} />
    </Tabs>
  );
}
