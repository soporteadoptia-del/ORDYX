import { artistSchema, firstError } from '@ordyx/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { createArtist } from '@/api/upload';
import { useToast } from '@/components/Toast';
import { Button, Text, TextField } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

export default function ArtistNew() {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = artistSchema.safeParse({ name, bio: bio.trim() || null });
    if (!parsed.success) return setError(firstError(parsed.error));
    setSaving(true);
    try {
      const id = await createArtist(parsed.data.name, parsed.data.bio);
      await qc.invalidateQueries({ queryKey: ['studio'] });
      toast.show('Perfil de artista creado', 'success');
      router.replace({ pathname: '/studio/upload', params: { artistId: id } });
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Nuevo artista' }} />
      <Text muted>El nombre artístico se mostrará en tus canciones. No uses el nombre de otro artista: la suplantación conlleva la retirada del contenido.</Text>
      <TextField label="Nombre artístico" value={name} onChangeText={setName} maxLength={80} />
      <TextField label="Biografía (opcional)" value={bio} onChangeText={setBio} multiline maxLength={2000} style={{ minHeight: 110, textAlignVertical: 'top' }} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button label="Crear artista" onPress={save} loading={saving} />
    </ScrollView>
  );
}
