import { commentSchema, firstError, formatCount, formatDuration, formatRelative, LICENSE_LABELS, type TrackLicense } from '@ordyx/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { getTrack } from '@/api/catalog';
import { addComment, deleteComment, getComments, type CommentWithAuthor } from '@/api/social';
import { Artwork } from '@/components/Artwork';
import { shareTrack, useTrackActions } from '@/components/TrackActions';
import { useToast } from '@/components/Toast';
import { Badge, Button, EmptyState, ErrorState, IconButton, Loading, SectionHeader, Text } from '@/components/ui';
import { useLikes } from '@/hooks/useLikes';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { playList } from '@/player/play';
import { useCurrentTrack, usePlayer } from '@/player/store';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { isLiked, toggle } = useLikes();
  const openActions = useTrackActions();
  const current = useCurrentTrack();
  const positionMs = usePlayer((s) => s.positionMs);
  const [body, setBody] = useState('');
  const [anchor, setAnchor] = useState(false);

  const track = useQuery({ queryKey: ['track', id], queryFn: () => getTrack(id) });
  const comments = useInfiniteQuery({
    queryKey: ['comments', id],
    queryFn: ({ pageParam }) => getComments(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === 20 ? pages.length : undefined),
  });
  const post = useMutation({
    mutationFn: (input: { body: string; timestamp_ms: number | null }) => addComment(id, input.body, input.timestamp_ms),
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['comments', id] });
      void qc.invalidateQueries({ queryKey: ['track', id] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });
  const remove = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['comments', id] }),
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  if (track.isLoading) return <Loading />;
  if (!track.data) return <ErrorState message={toUserMessage(track.error)} onRetry={() => track.refetch()} />;
  const t = track.data;
  const isPlayingThis = current?.id === t.id;

  function submit() {
    const parsed = commentSchema.safeParse({ body, timestamp_ms: anchor && isPlayingThis ? Math.round(positionMs) : null });
    if (!parsed.success) return toast.show(firstError(parsed.error), 'error');
    post.mutate(parsed.data);
  }

  const items = comments.data?.pages.flat() ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Artwork uri={imageUrl('covers', t.cover_path) ?? imageUrl('covers', t.artist?.image_path)} size={220} seed={t.id} />
              <Text variant="display" style={{ textAlign: 'center' }}>
                {t.title}
              </Text>
              <Pressable onPress={() => t.artist && router.push(`/artist/${t.artist.id}`)} accessibilityRole="link">
                <Text muted>{t.artist?.name}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
                {t.is_demo ? <Badge label="Demo" tone="warning" /> : null}
                {t.is_explicit ? <Badge label="Explícita" tone="muted" /> : null}
                {t.genre ? <Badge label={t.genre.name} /> : null}
              </View>
              <Text variant="caption" muted>
                {formatDuration(t.duration_ms)} · {formatCount(t.play_count)} reproducciones · {formatCount(t.like_count)} me gusta
              </Text>
            </View>
            <View style={styles.actions}>
              <Button label="Reproducir" icon="play" onPress={() => void playList([t], 0, { type: 'track', id: t.id })} disabled={!t.audio_path} style={{ flex: 1 }} />
              <IconButton
                name={isLiked(t.id) ? 'heart' : 'heart-outline'}
                color={isLiked(t.id) ? colors.accentWarm : colors.text}
                size={28}
                label={isLiked(t.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                onPress={() => toggle(t.id)}
              />
              <IconButton name="share-outline" label="Compartir" onPress={() => void shareTrack({ id: t.id, title: t.title, artistName: t.artist?.name })} />
              <IconButton name="ellipsis-horizontal" label="Más opciones" onPress={() => openActions(t)} />
            </View>
            {t.description ? <Text style={{ paddingHorizontal: spacing.lg }}>{t.description}</Text> : null}
            <Text variant="caption" muted style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
              Licencia: {LICENSE_LABELS[t.license as TrackLicense] ?? t.license}
              {t.rights_holder ? ` · ℗ ${t.rights_holder}` : ''}
            </Text>
            <SectionHeader title={`Comentarios (${formatCount(t.comment_count)})`} />
          </View>
        }
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            canDelete={item.user_id === session?.user.id || t.owner_id === session?.user.id}
            onDelete={() =>
              Alert.alert('Eliminar comentario', '¿Seguro?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(item.id) },
              ])
            }
          />
        )}
        ListEmptyComponent={comments.isLoading ? <Loading /> : <EmptyState icon="chatbubbles-outline" title="Sé la primera persona en comentar" />}
        onEndReached={() => comments.hasNextPage && !comments.isFetchingNextPage && comments.fetchNextPage()}
        ListFooterComponent={comments.isFetchingNextPage ? <ActivityIndicator color={colors.text} /> : null}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      />
      <View style={styles.composer}>
        {isPlayingThis ? (
          <Pressable onPress={() => setAnchor((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: anchor }} style={[styles.anchor, anchor && { borderColor: colors.accentStrong }]}>
            <Text variant="micro" style={{ color: anchor ? colors.accentStrong : colors.textMuted }}>
              {anchor ? formatDuration(positionMs) : 'EN'}
            </Text>
          </Pressable>
        ) : null}
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Escribe un comentario…"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          maxLength={1000}
          multiline
          accessibilityLabel="Escribe un comentario"
        />
        <IconButton name="send" label="Publicar comentario" color={colors.accentStrong} disabled={!body.trim() || post.isPending} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentRow({ comment, canDelete, onDelete }: { comment: CommentWithAuthor; canDelete: boolean; onDelete: () => void }) {
  const username = comment.author?.username;
  return (
    <View style={styles.comment}>
      <Pressable onPress={() => username && router.push(`/user/${username}`)} accessibilityRole="link">
        <Artwork uri={imageUrl('avatars', comment.author?.avatar_path)} size={36} rounded icon="person" seed={comment.user_id} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" muted>
          @{username ?? 'usuario'} · {formatRelative(comment.created_at)}
          {comment.timestamp_ms !== null ? ` · en ${formatDuration(comment.timestamp_ms)}` : ''}
        </Text>
        <Text>{comment.body}</Text>
      </View>
      {canDelete ? (
        <IconButton name="trash-outline" size={18} color={colors.textMuted} label="Eliminar comentario" onPress={onDelete} />
      ) : (
        <IconButton
          name="flag-outline"
          size={18}
          color={colors.textMuted}
          label="Denunciar comentario"
          onPress={() => router.push({ pathname: '/report', params: { type: 'comment', id: comment.id, label: 'este comentario' } })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  comment: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
  },
  anchor: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 4 },
});
