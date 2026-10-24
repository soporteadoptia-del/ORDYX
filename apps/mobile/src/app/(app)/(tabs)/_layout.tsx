import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { View } from 'react-native';
import { MiniPlayer } from '@/components/MiniPlayer';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const tabIcon = (focused: IconName, idle: IconName) =>
  function TabIcon({ color, focused: isFocused }: { color: string; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : idle} size={24} color={color} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View style={{ backgroundColor: colors.background }}>
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="search" options={{ title: 'Buscar', tabBarIcon: tabIcon('search', 'search-outline') }} />
      <Tabs.Screen name="library" options={{ title: 'Biblioteca', tabBarIcon: tabIcon('library', 'library-outline') }} />
      <Tabs.Screen name="me" options={{ title: 'Perfil', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
