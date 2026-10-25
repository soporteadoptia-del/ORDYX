import { createElement, useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import {
  embedOf,
  registerEmbedEngine,
  unregisterEmbedEngine,
  type EmbedEngine,
} from '@/player/embed';
import { onEmbedEnded, usePlayer, type PlayableTrack } from '@/player/store';
import { radius, spacing } from '@/theme';
import { Artwork } from './Artwork';
import { Button, Text } from './ui';

/** APIs de YouTube y SoundCloud, cargadas en tiempo de ejecución (sin tipos propios). */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    SC?: any;
  }
}

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string, ready?: () => boolean): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.async = true;
        el.onerror = () => reject(new Error('script'));
        el.onload = () => {
          if (!ready) return resolve();
          const t = setInterval(() => {
            if (ready()) {
              clearInterval(t);
              resolve();
            }
          }, 50);
        };
        document.head.appendChild(el);
      }),
    );
  }
  return scripts.get(src)!;
}

/** Referencia (id de YouTube o URL de SoundCloud) de la canción que toca ahora. */
const currentRef = () => {
  const q = usePlayer.getState().queue;
  return embedOf(q.entries[q.index]?.item)?.ref ?? null;
};

const set = (patch: Partial<ReturnType<typeof usePlayer.getState>>) => usePlayer.setState(patch);

/**
 * Reproductor oficial de YouTube o SoundCloud, en el sitio de la portada. Los botones de Aurevix
 * lo manejan (ver player/embed.ts) y él informa de su estado al reproductor de la app.
 */
export function EmbedPlayer({ track, size }: { track: PlayableTrack; size: number }) {
  const embed = embedOf(track)!;
  if (Platform.OS !== 'web') return <NativeFallback track={track} size={size} />;
  return embed.kind === 'youtube' ? <YouTubeFrame size={size} /> : <SoundCloudFrame size={size} />;
}

function YouTubeFrame({ size }: { size: number }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!host) return;
    let yt: any = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let disposed = false;
    const engine: EmbedEngine = {
      load(id, autoplay) {
        if (!yt) return;
        set({ status: autoplay ? 'loading' : 'paused', positionMs: 0 });
        if (autoplay) yt.loadVideoById(id);
        else yt.cueVideoById(id);
      },
      play: () => yt?.playVideo(),
      pause: () => yt?.pauseVideo(),
      seek: (ms) => yt?.seekTo(ms / 1000, true),
    };
    void loadScript('https://www.youtube.com/iframe_api', () => !!window.YT?.Player).then(() => {
      if (disposed) return;
      const div = document.createElement('div');
      host.appendChild(div);
      yt = new window.YT.Player(div, {
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => registerEmbedEngine(engine, currentRef()),
          onStateChange: (e: { data: number }) => {
            const S = window.YT.PlayerState;
            if (e.data === S.ENDED) return onEmbedEnded();
            const d = yt.getDuration?.();
            if (d > 0) set({ durationMs: Math.round(d * 1000) });
            if (e.data === S.PLAYING) set({ status: 'playing', isBuffering: false });
            else if (e.data === S.PAUSED || e.data === S.CUED)
              set({ status: 'paused', isBuffering: false });
            else if (e.data === S.BUFFERING) set({ isBuffering: true });
          },
          onError: () =>
            set({ status: 'error', error: 'Este vídeo no se puede reproducir fuera de YouTube.' }),
        },
      });
      poll = setInterval(() => {
        const t = yt?.getCurrentTime?.();
        if (typeof t === 'number' && usePlayer.getState().status === 'playing')
          set({ positionMs: Math.round(t * 1000) });
      }, 500);
    });
    return () => {
      disposed = true;
      if (poll) clearInterval(poll);
      unregisterEmbedEngine(engine);
      yt?.destroy?.();
      // Solo si sigue sonando una canción de YouTube/SoundCloud: si ya es otra, no se toca.
      if (currentRef()) set({ status: 'paused', isBuffering: false });
    };
  }, [host]);
  return createElement('div', { ref: setHost, style: frameStyle(size, size * 0.5625) });
}

function SoundCloudFrame({ size }: { size: number }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!host) return;
    let widget: any = null;
    let iframe: HTMLIFrameElement | null = null;
    let disposed = false;
    let autoplayNext = false;
    const bind = () => {
      const E = window.SC.Widget.Events;
      widget.bind(E.READY, () => {
        widget.getDuration((d: number) => d > 0 && set({ durationMs: d }));
        if (autoplayNext) widget.play();
      });
      widget.bind(E.PLAY, () => set({ status: 'playing', isBuffering: false }));
      widget.bind(E.PAUSE, () => set({ status: 'paused' }));
      widget.bind(E.FINISH, () => onEmbedEnded());
      widget.bind(E.PLAY_PROGRESS, (p: { currentPosition: number }) =>
        set({ positionMs: Math.round(p.currentPosition) }),
      );
      widget.bind(E.ERROR, () =>
        set({ status: 'error', error: 'Esta canción no se puede reproducir fuera de SoundCloud.' }),
      );
    };
    const engine: EmbedEngine = {
      load(url, autoplay) {
        autoplayNext = autoplay;
        set({ status: autoplay ? 'loading' : 'paused', positionMs: 0 });
        widget?.load(url, { auto_play: autoplay, visual: true, show_comments: false });
      },
      play: () => widget?.play(),
      pause: () => widget?.pause(),
      seek: (ms) => widget?.seekTo(ms),
    };
    void loadScript('https://w.soundcloud.com/player/api.js', () => !!window.SC?.Widget).then(
      () => {
        if (disposed) return;
        iframe = document.createElement('iframe');
        iframe.allow = 'autoplay; encrypted-media';
        iframe.style.cssText = 'border:0;width:100%;height:100%';
        iframe.src =
          'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2F&visual=true';
        host.appendChild(iframe);
        widget = window.SC.Widget(iframe);
        bind();
        registerEmbedEngine(engine, currentRef());
      },
    );
    return () => {
      disposed = true;
      unregisterEmbedEngine(engine);
      widget?.pause?.();
      iframe?.remove();
      // Solo si sigue sonando una canción de YouTube/SoundCloud: si ya es otra, no se toca.
      if (currentRef()) set({ status: 'paused', isBuffering: false });
    };
  }, [host]);
  return createElement('div', { ref: setHost, style: frameStyle(size, size) });
}

function NativeFallback({ track, size }: { track: PlayableTrack; size: number }) {
  const embed = embedOf(track)!;
  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <Artwork uri={track.coverUrl} size={size * 0.8} seed={track.id} />
      <Text muted style={{ textAlign: 'center' }}>
        En la app del móvil, las canciones de {embed.kind === 'youtube' ? 'YouTube' : 'SoundCloud'}{' '}
        se abren en su app.
      </Text>
      <Button
        label={embed.kind === 'youtube' ? 'Abrir en YouTube' : 'Abrir en SoundCloud'}
        icon={embed.kind === 'youtube' ? 'logo-youtube' : 'cloud-outline'}
        onPress={() => track.externalUrl && void Linking.openURL(track.externalUrl)}
      />
    </View>
  );
}

/** Estilo del contenedor DOM del reproductor oficial (solo web). */
function frameStyle(width: number, height: number) {
  return { width, height, borderRadius: radius.lg, overflow: 'hidden', background: '#000' };
}
