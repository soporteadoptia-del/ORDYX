'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  durationMs: number;
  artwork: string | null;
  artworkLarge: string | null;
  url: string;
  streamUrl: string;
}

const GENRES = [
  { key: '', label: 'Todo' },
  { key: 'Latin', label: 'Latino' },
  { key: 'Hip-Hop/Rap', label: 'Rap' },
  { key: 'Electronic', label: 'Electrónica' },
  { key: 'House', label: 'House' },
  { key: 'Pop', label: 'Pop' },
];

const ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/music-now`;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

const fmt = (s: number) =>
  Number.isFinite(s)
    ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    : '0:00';

/**
 * «Suena esta semana»: lo más escuchado esta semana en Audius (artistas independientes), que se
 * puede escuchar aquí mismo. Es lo vivo de la página: cambia cada semana y suena al pulsar.
 * El visualizador de puntos (idea del «Music Player Widget» de 21st.dev) late con la reproducción;
 * no analiza el audio porque el archivo viene de otro dominio y el navegador lo silenciaría.
 */
export function NowOnAudius() {
  const [genre, setGenre] = useState('');
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const count = useRef(0);
  useEffect(() => {
    count.current = tracks?.length ?? 0;
  }, [tracks]);

  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ view: 'trending', limit: '10', ...(genre ? { genre } : {}) });
    fetch(`${ENDPOINT}?${qs}`, { headers: { apikey: KEY }, signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { data?: Track[] }) => {
        setTracks(b.data ?? []);
        setFailed(false);
        setCurrent(0);
      })
      .catch((e: Error) => e.name !== 'AbortError' && setFailed(true));
    return () => ctrl.abort();
  }, [genre]);

  useEffect(() => () => audio.current?.pause(), []);

  const play = useCallback(
    (i: number) => {
      if (!tracks?.[i]) return;
      if (!audio.current) {
        const a = new Audio();
        a.preload = 'none';
        a.addEventListener('timeupdate', () => setTime(a.currentTime));
        a.addEventListener('loadedmetadata', () => setDuration(a.duration));
        a.addEventListener('play', () => setPlaying(true));
        a.addEventListener('pause', () => setPlaying(false));
        a.addEventListener('ended', () =>
          setCurrent((c) => (count.current ? (c + 1) % count.current : 0)),
        );
        audio.current = a;
      }
      const a = audio.current;
      if (i === current && a.src) {
        if (a.paused) void a.play().catch(() => setPlaying(false));
        else a.pause();
        return;
      }
      setCurrent(i);
      setTime(0);
      setDuration(tracks[i].durationMs / 1000);
      a.src = tracks[i].streamUrl;
      void a.play().catch(() => setPlaying(false));
    },
    [tracks, current],
  );

  // Al acabar una canción pasa a la siguiente (si había algo sonando).
  useEffect(() => {
    const a = audio.current;
    if (!a || !tracks || !a.src) return;
    const t = tracks[current];
    if (t && a.src !== t.streamUrl && a.ended) {
      a.src = t.streamUrl;
      void a.play().catch(() => setPlaying(false));
    }
  }, [current, tracks]);

  if (failed) return null;
  const t = tracks?.[current] ?? null;
  const progress = duration > 0 ? Math.min(1, time / duration) : 0;

  return (
    <section
      id="suena"
      aria-labelledby="suena-title"
      className="mx-auto max-w-[1400px] scroll-mt-8 px-[var(--gutter)] py-20 md:py-[14svh]"
    >
      <div className="mb-10 grid gap-6 md:grid-cols-2 md:items-end">
        <h2 id="suena-title" className="text-title">
          Suena esta semana
        </h2>
        <p className="max-w-[46ch] text-body text-muted">
          Lo más escuchado estos días por artistas independientes en{' '}
          <a
            href="https://audius.co"
            className="text-fg underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            Audius
          </a>
          . Pulsa una canción y escúchala aquí mismo; en la app la tienes entera, con tu cola.
        </p>
      </div>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Géneros">
        {GENRES.map((g) => (
          <button
            key={g.key || 'all'}
            type="button"
            role="tab"
            aria-selected={genre === g.key}
            onClick={() => setGenre(g.key)}
            className={`press shrink-0 rounded-full px-5 py-2.5 text-small font-semibold transition-colors ${genre === g.key ? 'bg-accent text-ink' : 'bg-surface text-fg hover:bg-elevated'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Lo que suena: disco que gira, visualizador y controles. */}
        <div className="relative overflow-hidden rounded-[28px] bg-surface p-6 md:col-span-5 md:p-8">
          <div className="flex items-center gap-6">
            <div
              className={`relative aspect-square w-[42%] shrink-0 overflow-hidden rounded-full bg-elevated ${playing ? 'spin' : ''}`}
            >
              {t?.artwork ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.artworkLarge ?? t.artwork}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              <span className="absolute inset-[38%] rounded-full bg-ink ring-4 ring-accent" />
            </div>
            <DotGrid playing={playing} />
          </div>
          <div className="mt-6 min-h-[88px]">
            <p className="line-clamp-2 font-display text-lead font-bold leading-tight">
              {t?.title ?? 'Cargando lo que suena…'}
            </p>
            <p className="mt-1 text-small text-muted">
              {t ? `${t.artist}${t.genre ? ` · ${t.genre}` : ''}` : ' '}
            </p>
          </div>
          <div className="mt-4">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full origin-left bg-accent"
                style={{ transform: `scaleX(${progress})`, transition: 'transform 250ms linear' }}
              />
            </div>
            <div className="mt-2 flex justify-between text-small text-subtle">
              <span>{fmt(time)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => play(current)}
              disabled={!t}
              aria-label={playing ? 'Pausar' : `Escuchar «${t?.title ?? ''}»`}
              className="press grid h-14 w-14 place-items-center rounded-full bg-accent text-ink disabled:opacity-50"
            >
              {playing ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => tracks && play((current + 1) % tracks.length)}
              disabled={!tracks?.length}
              aria-label="Siguiente"
              className="press grid h-12 w-12 place-items-center rounded-full bg-elevated text-fg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6 5v14l9-7zM16 5h3v14h-3z" />
              </svg>
            </button>
            {t ? (
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-small font-semibold text-muted underline underline-offset-4 hover:text-fg"
              >
                Ver en Audius
              </a>
            ) : null}
          </div>
        </div>

        {/* La lista: número grande, portada, título y artista. */}
        <ol className="md:col-span-7">
          {(tracks ?? Array.from({ length: 6 }, () => null)).map((tr, i) => (
            <li key={tr?.id ?? i}>
              <button
                type="button"
                disabled={!tr}
                onClick={() => play(i)}
                aria-current={tr && i === current ? 'true' : undefined}
                className={`press flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface ${tr && i === current ? 'bg-surface' : ''}`}
              >
                <span
                  className={`w-10 shrink-0 font-display text-[28px] font-extrabold leading-none ${tr && i === current ? 'text-accent' : 'text-subtle'}`}
                >
                  {i + 1}
                </span>
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-elevated">
                  {tr?.artwork ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tr.artwork}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">
                    {tr?.title ?? <span className="block h-4 w-40 rounded bg-elevated" />}
                  </span>
                  <span className="block truncate text-small text-muted">{tr?.artist ?? ' '}</span>
                </span>
                {tr ? (
                  <span className="hidden text-small text-subtle sm:block">
                    {fmt(tr.durationMs / 1000)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          {tracks && tracks.length === 0 ? (
            <li className="px-3 py-6 text-body text-muted">
              No hay canciones de este género esta semana.
            </li>
          ) : null}
        </ol>
      </div>
    </section>
  );
}

/** Rejilla de puntos que ondula mientras suena (y se queda quieta en pausa o con «reducir movimiento»). */
function DotGrid({ playing }: { playing: boolean }) {
  return (
    <div className={`dotgrid flex-1 ${playing ? 'is-playing' : ''}`} aria-hidden>
      {Array.from({ length: 8 }, (_, c) => (
        <span key={c} style={{ animationDelay: `${c * -0.13}s` }}>
          {Array.from({ length: 6 }, (_, r) => (
            <i key={r} style={{ animationDelay: `${(c + r) * -0.09}s` }} />
          ))}
        </span>
      ))}
    </div>
  );
}
