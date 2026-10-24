import { supabase } from '@/lib/supabase';

export async function startPlay(
  trackId: string,
  contextType: string | null,
  contextId: string | null,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('start_play', {
    p_track_id: trackId,
    p_source: 'mobile',
    p_context_type: contextType,
    p_context_id: contextId,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function reportPlayProgress(
  sessionId: string,
  listenedMs: number,
  completed: boolean,
) {
  const { error } = await supabase.rpc('report_play_progress', {
    p_session_id: sessionId,
    p_listened_ms: Math.max(0, Math.round(listenedMs)),
    p_completed: completed,
  });
  if (error) throw error;
}
