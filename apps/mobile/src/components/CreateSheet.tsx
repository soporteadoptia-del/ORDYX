import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { PressableScale } from './motion';
import { Sheet } from './Sheet';
import { Text, type IconName } from './ui';

const OPTIONS: { icon: IconName; title: string; text: string; href: Href }[] = [
  {
    icon: 'musical-notes',
    title: 'Lista',
    text: 'Crea una lista con tus canciones',
    href: '/playlist/new',
  },
  {
    icon: 'people',
    title: 'Lista colaborativa',
    text: 'Crea una lista con tus amigos',
    href: { pathname: '/playlist/new', params: { collab: '1' } },
  },
  {
    icon: 'git-merge',
    title: 'Fusión',
    text: 'Combina los gustos de un amigo y los tuyos en una lista',
    href: '/blend',
  },
  {
    icon: 'download',
    title: 'Importar',
    text: 'Trae listas de Spotify, YouTube o SoundCloud',
    href: '/import',
  },
  {
    icon: 'cloud-upload',
    title: 'Subir canción',
    text: 'Publica tu música (Premium)',
    href: '/studio',
  },
];

/** Botón «Crear» (como el de Spotify): lista, lista colaborativa, Fusión, importar o subir. */
export function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Crear">
      <View style={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}>
        {OPTIONS.map((o) => (
          <PressableScale
            key={o.title}
            onPress={() => {
              onClose();
              router.push(o.href);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${o.title}: ${o.text}`}
            style={styles.row}
          >
            <View style={styles.icon}>
              <Ionicons name={o.icon} size={24} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{o.title}</Text>
              <Text variant="caption" muted>
                {o.text}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
