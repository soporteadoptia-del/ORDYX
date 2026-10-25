import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '@/components/MiniPlayer';
import { colors, fonts } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const tabIcon = (focused: IconName, idle: IconName) =>
  function TabIcon({ color, focused: isFocused }: { color: unknown; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : idle} size={24} color={color as string} />;
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      tabBar={(props) => (
        <View style={{ backgroundColor: 'transparent' }}>
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSubtle,
        // Las pestañas dejan ver el fondo de marca del layout.
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: colors.border,
          // Algo más alta que la estándar para que quepan las etiquetas con Instrument Sans.
          height: 70 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyStrong },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Buscar', tabBarIcon: tabIcon('search', 'search-outline') }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Biblioteca', tabBarIcon: tabIcon('library', 'library-outline') }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
      />
    </Tabs>
  );
}
