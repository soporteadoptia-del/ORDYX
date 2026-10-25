import { createElement } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { usePlayer } from '@/player/store';
import { colors, radius, spacing } from '@/theme';
import { IconButton, Text } from './ui';

export const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/**
 * Abre un vídeo de YouTube. En la versión web se ve dentro de Aurevix con el reproductor oficial
 * incrustado de YouTube (sus condiciones exigen que el vídeo se vea, así que no suena en segundo
 * plano). En el móvil se abre la app de YouTube.
 */
export function openYouTube(id: string, show: (id: string) => void) {
  usePlayer.getState().stop();
  if (Platform.OS === 'web') show(id);
  else void Linking.openURL(youtubeUrl(id));
}

export function YouTubeModal({
  videoId,
  title,
  onClose,
}: {
  videoId: string | null;
  title?: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!videoId} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar vídeo">
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.head}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {title ?? 'YouTube'}
            </Text>
            <IconButton name="close" label="Cerrar" onPress={onClose} />
          </View>
          <View style={styles.frame}>
            {videoId && Platform.OS === 'web'
              ? createElement('iframe', {
                  src: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`,
                  title: title ?? 'Vídeo de YouTube',
                  allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
                  allowFullScreen: true,
                  style: { border: 0, width: '100%', height: '100%' },
                })
              : null}
          </View>
          <Text variant="caption" muted>
            Reproducido con el reproductor oficial de YouTube.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
