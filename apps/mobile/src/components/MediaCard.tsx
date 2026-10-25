import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import { Artwork } from './Artwork';
import { Text } from './ui';

export interface CardItem {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string | null;
  round?: boolean;
  icon?: 'musical-notes' | 'person' | 'list' | 'disc';
  onPress: () => void;
}

export const MediaCard = memo(function MediaCard({
  item,
  size = 156,
}: {
  item: CardItem;
  size?: number;
}) {
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={[item.title, item.subtitle].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        { width: size, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Artwork
        uri={item.imageUrl}
        size={size}
        rounded={item.round}
        icon={item.icon}
        seed={item.id}
      />
      <View style={styles.text}>
        <Text
          variant="bodyStrong"
          numberOfLines={1}
          style={item.round ? { textAlign: 'center' } : undefined}
        >
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text
            muted
            variant="caption"
            numberOfLines={2}
            style={item.round ? { textAlign: 'center' } : undefined}
          >
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export function Carousel({ items, size }: { items: CardItem[]; size?: number }) {
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <MediaCard item={item} size={size} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
      initialNumToRender={4}
    />
  );
}

const styles = StyleSheet.create({ text: { marginTop: spacing.sm, gap: 2 } });
