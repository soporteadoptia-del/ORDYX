import { firstError, playlistSchema, type PlaylistInput } from '@ordyx/shared';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { Button, Text, TextField } from './ui';

export interface PickedImage {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export async function pickImage(): Promise<PickedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? `imagen.${a.mimeType === 'image/png' ? 'png' : 'jpg'}`,
    size: a.fileSize ?? 0,
    mimeType: a.mimeType ?? 'image/jpeg',
  };
}

export function PlaylistForm({
  initial,
  currentCover,
  submitLabel,
  onSubmit,
}: {
  initial: PlaylistInput;
  currentCover?: string | null;
  submitLabel: string;
  onSubmit: (values: PlaylistInput, cover: PickedImage | null) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [cover, setCover] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = playlistSchema.safeParse({
      ...values,
      description: values.description?.trim() || null,
    });
    if (!parsed.success) return setError(firstError(parsed.error));
    setError(null);
    setSaving(true);
    try {
      await onSubmit(parsed.data, cover);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={async () => {
          const img = await pickImage();
          if (img) setCover(img);
        }}
        accessibilityRole="button"
        accessibilityLabel="Elegir portada"
        style={{ alignSelf: 'center', alignItems: 'center', gap: spacing.sm }}
      >
        <Artwork
          uri={cover?.uri ?? currentCover ?? null}
          size={160}
          icon="list"
          seed={values.title}
        />
        <Text variant="caption" style={{ color: colors.accentStrong }}>
          Elegir portada
        </Text>
      </Pressable>
      <TextField
        label="Título"
        value={values.title}
        onChangeText={(title) => setValues((v) => ({ ...v, title }))}
        maxLength={100}
      />
      <TextField
        label="Descripción (opcional)"
        value={values.description ?? ''}
        onChangeText={(description) => setValues((v) => ({ ...v, description }))}
        multiline
        maxLength={2000}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Pública</Text>
          <Text variant="caption" muted>
            Cualquiera podrá verla, buscarla y abrirla con un enlace.
          </Text>
        </View>
        <Switch
          value={values.is_public}
          onValueChange={(is_public) => setValues((v) => ({ ...v, is_public }))}
          trackColor={{ true: colors.accent, false: colors.border }}
          accessibilityLabel="Playlist pública"
        />
      </View>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button label={submitLabel} onPress={submit} loading={saving} />
    </ScrollView>
  );
}
