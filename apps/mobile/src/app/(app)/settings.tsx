import { BRAND } from '@ordyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { deleteMyAccount, exportMyData, getMySettings, updateMySettings } from '@/api/me';
import { useToast } from '@/components/Toast';
import { Button, Loading, SectionHeader, Text } from '@/components/ui';
import { env } from '@/lib/env';
import { toUserMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function Settings() {
  const { signOut, session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useQuery({ queryKey: ['me', 'settings'], queryFn: getMySettings });
  const update = useMutation({
    mutationFn: updateMySettings,
    onMutate: (patch) => qc.setQueryData(['me', 'settings'], { ...settings.data, ...patch }),
    onError: (e) => {
      toast.show(toUserMessage(e), 'error');
      void settings.refetch();
    },
  });

  async function onExport() {
    try {
      const data = await exportMyData();
      const file = new FileSystem.File(
        FileSystem.Paths.cache,
        `aurevix-mis-datos-${Date.now()}.json`,
      );
      file.write(JSON.stringify(data, null, 2));
      await Share.share({
        url: file.uri,
        message: 'Exportación de mis datos de Aurevix Music (JSON)',
      });
    } catch (e) {
      toast.show(toUserMessage(e), 'error');
    }
  }

  function onDelete() {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán tu perfil, playlists, favoritos, historial y las canciones que hayas subido. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar definitivamente',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMyAccount();
              await signOut('local');
            } catch (e) {
              toast.show(toUserMessage(e), 'error');
            }
          },
        },
      ],
    );
  }

  if (settings.isLoading) return <Loading />;
  const s = settings.data;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
    >
      <Stack.Screen options={{ title: 'Ajustes' }} />
      <SectionHeader title="Privacidad" />
      <Toggle
        label="Favoritos públicos"
        description="Otras personas podrán ver tus canciones favoritas en tu perfil."
        value={!!s?.show_likes_public}
        onChange={(v) => update.mutate({ show_likes_public: v })}
      />
      <Toggle
        label="Contenido explícito"
        description="Mostrar canciones marcadas como explícitas."
        value={!!s?.allow_explicit}
        onChange={(v) => update.mutate({ allow_explicit: v })}
      />
      <Toggle
        label="Correos de notificación"
        value={!!s?.email_notifications}
        onChange={(v) => update.mutate({ email_notifications: v })}
      />

      <SectionHeader title="Cuenta" />
      <View style={styles.group}>
        <Text muted variant="caption">
          Sesión iniciada como {session?.user.email}
        </Text>
        <Button
          label="Editar perfil"
          variant="secondary"
          icon="person-outline"
          onPress={() => router.push('/profile-edit')}
        />
        <Button
          label="Exportar mis datos"
          variant="secondary"
          icon="download-outline"
          onPress={onExport}
        />
        <Button
          label="Cerrar sesión"
          variant="secondary"
          icon="log-out-outline"
          onPress={() => void signOut('local')}
        />
        <Button
          label="Cerrar sesión en todos los dispositivos"
          variant="secondary"
          icon="phone-portrait-outline"
          onPress={() =>
            Alert.alert(
              'Cerrar todas las sesiones',
              'Tendrás que volver a iniciar sesión en todos tus dispositivos.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Cerrar todas',
                  style: 'destructive',
                  onPress: () => void signOut('global'),
                },
              ],
            )
          }
        />
        <Button
          label="Eliminar mi cuenta"
          variant="danger"
          icon="trash-outline"
          onPress={onDelete}
        />
      </View>

      <SectionHeader title="Ayuda y legal" />
      <View style={styles.group}>
        <Button
          label="Centro de ayuda"
          variant="ghost"
          icon="help-circle-outline"
          onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/ayuda`)}
        />
        <Button
          label="Contactar con soporte"
          variant="ghost"
          icon="mail-outline"
          onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`)}
        />
        <Button
          label="Condiciones de uso"
          variant="ghost"
          icon="document-text-outline"
          onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/condiciones`)}
        />
        <Button
          label="Política de privacidad"
          variant="ghost"
          icon="shield-checkmark-outline"
          onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/privacidad`)}
        />
        <Button
          label="Reclamar derechos de autor"
          variant="ghost"
          icon="flag-outline"
          onPress={() => WebBrowser.openBrowserAsync(`${env.webUrl}/derechos`)}
        />
        <Text variant="caption" muted style={{ textAlign: 'center', marginTop: spacing.lg }}>
          {BRAND.name} {Constants.expoConfig?.version ?? ''}
        </Text>
      </View>
    </ScrollView>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="caption" muted>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
