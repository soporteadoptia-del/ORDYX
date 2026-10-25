import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { getLyrics, setLyrics } from '@/api/plus';
import { toUserMessage } from '@/lib/errors';
import { parseLyrics } from '@/lib/lyrics';
import { spacing } from '@/theme';
import { useToast } from './Toast';
import { Button, Text, TextField } from './ui';

/** Letra de una canción, editable por su artista. Admite texto normal o LRC sincronizado. */
export function LyricsEditor({ trackId }: { trackId: string }) {
  const saved = useQuery({ queryKey: ['lyrics', trackId], queryFn: () => getLyrics(trackId) });
  if (saved.isLoading) return null;
  if (saved.error)
    return (
      <Text variant="caption" muted>
        No se ha podido cargar la letra: {toUserMessage(saved.error)}
      </Text>
    );
  return <Editor trackId={trackId} initial={saved.data ?? ''} />;
}

function Editor({ trackId, initial }: { trackId: string; initial: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { lines, synced } = parseLyrics(value);
  const dirty = value !== initial;

  async function save() {
    setBusy(true);
    try {
      await setLyrics(trackId, value.trim() ? value.trim() : null);
      await qc.invalidateQueries({ queryKey: ['lyrics', trackId] });
      toast.show('Letra guardada', 'success');
    } catch (e) {
      toast.show(toUserMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="heading">Letra</Text>
      <Text variant="caption" muted>
        Pega la letra tal cual o en formato LRC para que avance con la canción, por ejemplo
        «[00:12.50] Primera línea». La ven quienes tienen Aurevix Premium.
      </Text>
      <TextField
        label={
          value.trim()
            ? `${lines.length} líneas · ${synced ? 'sincronizada' : 'sin sincronizar'}`
            : 'Sin letra'
        }
        value={value}
        onChangeText={setValue}
        multiline
        maxLength={20000}
        placeholder={'[00:00.00] Primera línea\n[00:04.20] Segunda línea'}
        style={{ minHeight: 160, textAlignVertical: 'top' }}
      />
      <Button
        label="Guardar letra"
        variant="secondary"
        icon="text"
        loading={busy}
        disabled={!dirty}
        onPress={() => void save()}
      />
    </View>
  );
}
