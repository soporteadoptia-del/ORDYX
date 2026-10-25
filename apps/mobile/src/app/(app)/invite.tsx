import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, spacing } from '@/theme';

/** Invitar a amigos: comparte tu perfil y la app para poder seguiros, escribiros y hacer Fusiones. */
export default function InviteScreen() {
  const { profile } = useAuth();
  const link = `${env.webUrl}/app/user/${profile?.username ?? ''}`;
  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ title: 'Invitar a amigos' }} />
      <View style={styles.icon}>
        <Ionicons name="people" size={44} color={colors.onAccent} />
      </View>
      <Text style={styles.big}>Escuchad juntos</Text>
      <Text muted style={{ textAlign: 'center' }}>
        Invita a tus amigos a Aurevix Music. Cuando os sigáis podréis enviaros canciones, crear
        listas colaborativas y hacer una Fusión con los gustos de los dos.
      </Text>
      <Button
        label="Enviar invitación"
        icon="share-social-outline"
        onPress={() =>
          void Share.share({
            message: `Escucha conmigo en Aurevix Music: música gratis y sin anuncios. Sígueme: ${link}`,
          })
        }
      />
      <Text variant="caption" muted>
        {link}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { fontFamily: fonts.displayHeavy, fontSize: 32, letterSpacing: -1, color: colors.text },
});
