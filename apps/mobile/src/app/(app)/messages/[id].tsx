import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { getTracksByIds } from '@/api/catalog';
import { currentUserId } from '@/api/library';
import { getThread, markThreadRead, sendMessage, type Message } from '@/api/together';
import type { TrackListItem } from '@/api/types';
import { Artwork } from '@/components/Artwork';
import { PressableScale } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { ErrorState, IconButton, Loading, Text } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { imageUrl } from '@/lib/media';
import { safeBottom } from '@/lib/safe-area';
import { playList } from '@/player/play';
import { colors, fonts, radius, spacing } from '@/theme';

export default function ThreadScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const list = useRef<FlatList<Message>>(null);
  const me = useQuery({ queryKey: ['me', 'id'], queryFn: currentUserId, staleTime: Infinity });
  const thread = useQuery({
    queryKey: ['messages', 'thread', id],
    queryFn: () => getThread(id!),
    refetchInterval: 5_000,
  });
  const trackIds = [
    ...new Set((thread.data ?? []).map((m) => m.track_id).filter(Boolean)),
  ] as string[];
  const tracks = useQuery({
    queryKey: ['messages', 'tracks', trackIds.join(',')],
    queryFn: () => getTracksByIds(trackIds),
    enabled: trackIds.length > 0,
  });
  const byId = new Map((tracks.data ?? []).map((t) => [t.id, t]));
  const unread = (thread.data ?? []).some((m) => m.sender_id === id && !m.read_at);

  useEffect(() => {
    if (!unread) return;
    void markThreadRead(id!).then(() =>
      qc.invalidateQueries({ queryKey: ['messages', 'conversations'] }),
    );
  }, [unread, id, qc]);

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(id!, { body }),
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (e) => toast.show(toUserMessage(e), 'error'),
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: name ?? 'Mensajes' }} />
      {thread.isLoading ? <Loading /> : null}
      {thread.error ? (
        <ErrorState message={toUserMessage(thread.error)} onRetry={() => void thread.refetch()} />
      ) : null}
      <FlatList
        ref={list}
        data={thread.data ?? []}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => {
          const mine = item.sender_id === me.data;
          const track = item.track_id ? byId.get(item.track_id) : undefined;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {track ? <TrackBubble track={track} mine={mine} /> : null}
              {item.playlist_id ? (
                <PressableScale
                  onPress={() => router.push(`/playlist/${item.playlist_id}`)}
                  accessibilityRole="link"
                  style={styles.attach}
                >
                  <Ionicons name="list" size={18} color={mine ? colors.onAccent : colors.accent} />
                  <Text style={{ color: mine ? colors.onAccent : colors.text }}>Ver la lista</Text>
                </PressableScale>
              ) : null}
              {item.body ? (
                <Text style={{ color: mine ? colors.onAccent : colors.text }}>{item.body}</Text>
              ) : null}
              <Text
                variant="micro"
                style={{
                  color: mine ? 'rgba(12,12,14,0.6)' : colors.textSubtle,
                  alignSelf: 'flex-end',
                }}
              >
                {new Date(item.created_at).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {mine && item.read_at ? ' · Visto' : ''}
              </Text>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { paddingBottom: safeBottom(0, spacing.sm) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje"
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={1000}
          accessibilityLabel="Mensaje"
          style={styles.input}
        />
        <IconButton
          name="send"
          label="Enviar"
          color={text.trim() ? colors.accent : colors.textSubtle}
          onPress={() => text.trim() && !send.isPending && send.mutate(text)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function TrackBubble({ track, mine }: { track: TrackListItem; mine: boolean }) {
  return (
    <PressableScale
      onPress={() => void playList([track], 0, { type: 'track', id: track.id })}
      accessibilityRole="button"
      accessibilityLabel={`Reproducir ${track.title}`}
      style={styles.attach}
    >
      <Artwork uri={imageUrl('covers', track.cover_path)} size={44} seed={track.id} />
      <View style={{ flex: 1 }}>
        <Text
          variant="bodyStrong"
          numberOfLines={1}
          style={{ color: mine ? colors.onAccent : colors.text }}
        >
          {track.title}
        </Text>
        <Text
          variant="caption"
          numberOfLines={1}
          style={{ color: mine ? 'rgba(12,12,14,0.7)' : colors.textMuted }}
        >
          {track.artist?.name}
        </Text>
      </View>
      <Ionicons name="play-circle" size={28} color={mine ? colors.onAccent : colors.accent} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', padding: spacing.md, borderRadius: radius.lg, gap: spacing.xs },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 6,
  },
  attach: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 220 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
