import { firstError, profileUpdateSchema } from '@ordyx/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { updateMyProfile } from '@/api/me';
import { uploadImage } from '@/api/upload';
import { Artwork } from '@/components/Artwork';
import { pickImage, type PickedImage } from '@/components/PlaylistForm';
import { useToast } from '@/components/Toast';
import { Button, Loading, Text, TextField } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function ProfileEdit() {
  const { profile, refreshProfile, session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    username: profile?.username ?? '',
    display_name: profile?.display_name ?? '',
    bio: profile?.bio ?? '',
  });
  const [avatar, setAvatar] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!profile) return <Loading />;

  async function save() {
    const parsed = profileUpdateSchema.safeParse({
      ...form,
      display_name: form.display_name.trim() || null,
      bio: form.bio.trim() || null,
    });
    if (!parsed.success) return setError(firstError(parsed.error));
    setSaving(true);
    setError(null);
    try {
      let avatar_path = profile!.avatar_path;
      if (avatar) avatar_path = (await uploadImage('avatar', avatar, session!.user.id)).path;
      await updateMyProfile({ ...parsed.data, avatar_path });
      refreshProfile();
      void qc.invalidateQueries({ queryKey: ['user'] });
      toast.show('Perfil actualizado', 'success');
      router.back();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={async () => {
          const img = await pickImage();
          if (img) setAvatar(img);
        }}
        style={{ alignSelf: 'center', alignItems: 'center', gap: spacing.sm }}
        accessibilityRole="button"
        accessibilityLabel="Cambiar foto de perfil"
      >
        <Artwork
          uri={avatar?.uri ?? imageUrl('avatars', profile.avatar_path)}
          size={120}
          rounded
          icon="person"
          seed={profile.id}
        />
        <Text variant="caption" style={{ color: colors.accentStrong }}>
          Cambiar foto
        </Text>
      </Pressable>
      <TextField
        label="Nombre de usuario"
        value={form.username}
        onChangeText={(username) => setForm((f) => ({ ...f, username }))}
        autoCapitalize="none"
      />
      <TextField
        label="Nombre visible"
        value={form.display_name}
        onChangeText={(display_name) => setForm((f) => ({ ...f, display_name }))}
        maxLength={60}
      />
      <TextField
        label="Biografía"
        value={form.bio}
        onChangeText={(bio) => setForm((f) => ({ ...f, bio }))}
        multiline
        maxLength={500}
        style={{ minHeight: 100, textAlignVertical: 'top' }}
      />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button label="Guardar" onPress={save} loading={saving} />
    </ScrollView>
  );
}
