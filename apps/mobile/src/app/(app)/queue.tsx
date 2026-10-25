import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Artwork } from '@/components/Artwork';
import { EmptyState, IconButton, SectionHeader, Text } from '@/components/ui';
import { usePlayer } from '@/player/store';
import { colors, spacing } from '@/theme';

export default function Queue() {
  const queue = usePlayer((s) => s.queue);
  const jumpTo = usePlayer((s) => s.jumpTo);
  const remove = usePlayer((s) => s.removeFromQueue);
  const move = usePlayer((s) => s.moveInQueue);

  if (queue.entries.length === 0)
    return <EmptyState icon="list-outline" title="La cola está vacía" />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={queue.entries}
      keyExtractor={(e) => e.key}
      ListHeaderComponent={
        <SectionHeader
          title={`${queue.entries.length} canciones${queue.shuffle ? ' · aleatorio' : ''}${queue.repeat !== 'off' ? ' · repetición' : ''}`}
        />
      }
      contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
      renderItem={({ item, index }) => {
        const isCurrent = index === queue.index;
        return (
          <Pressable
            onPress={() => void jumpTo(index)}
            accessibilityRole="button"
            accessibilityLabel={`${item.item.title}${isCurrent ? ', sonando ahora' : ''}`}
            style={[styles.row, isCurrent && { backgroundColor: colors.accentSoft }]}
          >
            <Artwork uri={item.item.coverUrl} size={44} seed={item.item.id} />
            <View style={{ flex: 1 }}>
              <Text
                variant="bodyStrong"
                numberOfLines={1}
                style={isCurrent ? { color: colors.accentStrong } : undefined}
              >
                {item.item.title}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {item.item.artistName}
              </Text>
            </View>
            <IconButton
              name="chevron-up"
              label="Subir"
              size={20}
              disabled={index === 0}
              onPress={() => move(index, index - 1)}
            />
            <IconButton
              name="chevron-down"
              label="Bajar"
              size={20}
              disabled={index === queue.entries.length - 1}
              onPress={() => move(index, index + 1)}
            />
            <IconButton
              name="close"
              label="Quitar de la cola"
              size={20}
              color={colors.textMuted}
              onPress={() => void remove(index)}
            />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
