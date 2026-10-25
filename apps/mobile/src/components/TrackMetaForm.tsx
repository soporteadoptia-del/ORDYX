import { LICENSE_LABELS, TRACK_LICENSES, type Genre, type TrackLicense } from '@ordyx/shared';
import { ScrollView, View } from 'react-native';
import { spacing } from '@/theme';
import { Chip, Text, TextField, BrandSwitch } from './ui';

export interface TrackMetaValues {
  title: string;
  description: string;
  genre_id: number | null;
  license: TrackLicense;
  rights_holder: string;
  is_explicit: boolean;
}

/** Campos de metadatos compartidos por la subida y la edición de canciones. */
export function TrackMetaForm({
  values,
  onChange,
  genres,
}: {
  values: TrackMetaValues;
  onChange: (v: TrackMetaValues) => void;
  genres: Genre[];
}) {
  const set = <K extends keyof TrackMetaValues>(k: K, v: TrackMetaValues[K]) =>
    onChange({ ...values, [k]: v });
  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label="Título"
        value={values.title}
        onChangeText={(v) => set('title', v)}
        maxLength={120}
      />
      <TextField
        label="Descripción (opcional)"
        value={values.description}
        onChangeText={(v) => set('description', v)}
        multiline
        maxLength={2000}
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" muted>
          Género
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {genres.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              selected={values.genre_id === g.id}
              onPress={() => set('genre_id', values.genre_id === g.id ? null : g.id)}
            />
          ))}
        </ScrollView>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" muted>
          Licencia
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TRACK_LICENSES.map((l) => (
            <Chip
              key={l}
              label={LICENSE_LABELS[l]}
              selected={values.license === l}
              onPress={() => set('license', l)}
            />
          ))}
        </View>
      </View>
      <TextField
        label="Titular de los derechos (persona o sello)"
        value={values.rights_holder}
        onChangeText={(v) => set('rights_holder', v)}
        maxLength={200}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="bodyStrong">Contenido explícito</Text>
        <BrandSwitch
          value={values.is_explicit}
          onValueChange={(v) => set('is_explicit', v)}
          accessibilityLabel="Contenido explícito"
        />
      </View>
    </View>
  );
}
