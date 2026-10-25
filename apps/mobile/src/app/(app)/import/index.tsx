import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { getImportedLists, importList, syncOldImports } from '@/api/imports';
import { PressableScale } from '@/components/motion';
import { LIST_BOTTOM_PADDING } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { Button, SectionHeader, Text, TextField } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { colors, fonts, radius, spacing } from '@/theme';

const HELP = [
  {
    icon: 'logo-youtube',
    text: 'YouTube: copia el enlace de cada vídeo (Compartir → Copiar enlace).',
  },
  { icon: 'cloud', text: 'SoundCloud: copia el enlace de cada canción.' },
  {
    icon: 'musical-notes',
    text: 'Spotify: en el ordenador, selecciona las canciones de una lista y pulsa Ctrl+C (Cmd+C en Mac); se copian sus enlaces.',
  },
  { icon: 'create', text: 'O escribe una canción por línea: «Artista - Canción».' },
] as const;

/**
 * Importar listas de Spotify, YouTube y SoundCloud: se pegan enlaces o «Artista - Canción» y
 * Aurevix busca cada canción en su catálogo y en Audius. Los vídeos de YouTube que no estén en
 * otro sitio se ven con el reproductor oficial de YouTube.
 */
export default function ImportScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const lists = useQuery({ queryKey: ['imports'], queryFn: getImportedLists });
  useEffect(() => {
    void syncOldImports();
  }, []);
  const [name, setName] = useState('');
  const params = useLocalSearchParams<{ text?: string }>();
  const [text, setText] = useState(params.text ?? '');
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const lines = text
    .split(/[\n\r]+|\s(?=https?:\/\/)/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const run = useMutation({
    mutationFn: () => importList(name, lines, (d, t) => setProgress([d, t])),
    onSuccess: (list) => {
      setProgress(null);
      setText('');
      setName('');
      void qc.invalidateQueries({ queryKey: ['imports'] });
      const found = list.items.filter((i) => i.match || i.youtubeId).length;
      toast.show(`${found} de ${list.items.length} canciones listas para escuchar`, 'success');
      router.push(`/import/${list.id}`);
    },
    onError: (e) => {
      setProgress(null);
      toast.show(toUserMessage(e), 'error');
    },
  });

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: LIST_BOTTOM_PADDING + spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Importar listas' }} />
      <View style={styles.form}>
        <Text style={styles.big}>Trae tu música</Text>
        <Text muted>
          Pega enlaces de Spotify, YouTube o SoundCloud, o escribe «Artista - Canción». Buscamos
          cada una en Aurevix, en Audius y en YouTube, y lo que importas lo puede escuchar todo el
          mundo en Aurevix.
        </Text>
        <TextField
          label="Nombre de la lista"
          value={name}
          onChangeText={setName}
          placeholder="Mi lista de Spotify"
        />
        <View style={{ gap: spacing.xs }}>
          <Text variant="caption" muted>
            Canciones (una por línea, hasta 100)
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={'https://youtu.be/…\nhttps://open.spotify.com/track/…\nRosalía - Despechá'}
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="Canciones a importar"
            style={styles.area}
          />
        </View>
        <Button
          label={
            progress
              ? `Buscando ${progress[0]} de ${progress[1]}…`
              : lines.length
                ? `Importar ${lines.length} ${lines.length === 1 ? 'canción' : 'canciones'}`
                : 'Importar'
          }
          icon="download-outline"
          disabled={!lines.length || run.isPending}
          onPress={() => run.mutate()}
        />
        <View style={styles.help}>
          {HELP.map((h) => (
            <View key={h.icon} style={styles.helpRow}>
              <Ionicons name={h.icon} size={18} color={colors.accent} />
              <Text variant="caption" muted style={{ flex: 1 }}>
                {h.text}
              </Text>
            </View>
          ))}
          <Text variant="caption" muted>
            No copiamos ni descargamos audio de otros servicios: enlazamos la misma canción donde se
            puede escuchar legalmente.
          </Text>
        </View>
      </View>

      {(lists.data?.length ?? 0) > 0 ? (
        <>
          <SectionHeader title="Tus listas importadas" />
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {lists.data!.map((l) => {
              const ok = l.items.filter((i) => i.match || i.youtubeId).length;
              return (
                <PressableScale
                  key={l.id}
                  onPress={() => router.push(`/import/${l.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={l.name}
                  style={styles.listRow}
                >
                  <View style={styles.listIcon}>
                    <Ionicons name="list" size={20} color={colors.onAccent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text variant="caption" muted>
                      {ok} de {l.items.length} canciones para escuchar
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </PressableScale>
              );
            })}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  big: {
    fontFamily: fonts.displayHeavy,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    color: colors.text,
  },
  area: {
    minHeight: 140,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  help: { gap: spacing.sm, marginTop: spacing.sm },
  helpRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#B98CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
