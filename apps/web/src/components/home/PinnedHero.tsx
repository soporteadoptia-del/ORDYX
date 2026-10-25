'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PLAY_RULES } from '@ordyx/shared';

/** Las cinco pistas de demostración del catálogo (audio sintetizado, CC0), con su color de fondo. */
const TRACKS = [
  { n: 1, title: 'Luz de neón', genre: 'Electrónica', ground: '#1a2210', ink: '#f3f1ea' },
  { n: 2, title: 'Domingo lento', genre: 'Lo-fi', ground: '#241c36', ink: '#f3f1ea' },
  { n: 3, title: 'Marea interior', genre: 'Ambient', ground: '#0f1a2b', ink: '#f3f1ea' },
  { n: 4, title: 'Pulso urbano', genre: 'Urbano', ground: '#c8f560', ink: '#0c0c0e' },
  { n: 5, title: 'Ciudad a las tres', genre: 'Electrónica', ground: '#1c1726', ink: '#f3f1ea' },
] as const;

const VALID_S = PLAY_RULES.validPlayMinMs / 1000;

/**
 * Portada «pinned poster»: el nombre se queda fijo mientras pasan las canciones, cada una con su
 * crédito. Lo vivo: escuchar la pista y ver cuándo la escucha empieza a contar (a los 30 s reales).
 * El desplazamiento es el normal de la página (position: sticky); no se secuestra el scroll.
 */
export function PinnedHero() {
  const wrap = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const track = TRACKS[active];

  // Qué canción toca según cuánto se ha recorrido la sección (solo cambia el estado al cambiar).
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        const progress = Math.min(
          1,
          Math.max(0, -el.getBoundingClientRect().top / Math.max(1, total)),
        );
        const next = Math.min(TRACKS.length - 1, Math.floor(progress * TRACKS.length));
        if (next === activeRef.current) return;
        // Al cambiar de canción se para la anterior.
        activeRef.current = next;
        audio.current?.pause();
        setPlaying(false);
        setSeconds(0);
        setActive(next);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => () => audio.current?.pause(), []);

  function toggle() {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.addEventListener('timeupdate', () =>
        setSeconds(Math.floor(audio.current?.currentTime ?? 0)),
      );
      audio.current.addEventListener('ended', () => setPlaying(false));
    }
    const a = audio.current;
    const src = `/demo/track-${track.n}.m4a`;
    if (!a.src.endsWith(src)) {
      a.src = src;
      setSeconds(0);
    }
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    }
  }

  const counted = seconds >= VALID_S;
  const progress = Math.min(1, seconds / VALID_S);

  return (
    <section
      ref={wrap}
      aria-labelledby="hero-title"
      className="relative"
      style={{ height: `calc(100svh + ${TRACKS.length - 1} * 60svh)`, marginTop: '-76px' }}
    >
      <div
        className="sticky top-0 h-[100svh] overflow-hidden"
        style={{
          backgroundColor: track.ground,
          color: track.ink,
          transition: 'background-color 500ms ease, color 500ms ease',
        }}
      >
        <h1
          id="hero-title"
          className="pointer-events-none absolute inset-x-0 top-[96px] z-20 px-[var(--gutter)] text-center font-display text-[clamp(64px,16vw,168px)] font-extrabold uppercase leading-[0.86] tracking-[-0.04em] md:top-[11svh] md:whitespace-nowrap md:text-poster"
        >
          Aurevix <br className="md:hidden" />
          Music
        </h1>

        {/* Las portadas, en el mismo sitio y proporción: cambia la imagen, no el marco. */}
        <div className="absolute left-1/2 top-[calc(112px+30vw)] z-10 aspect-square w-[max(140px,min(calc(100vw-32px),calc(100svh-30vw-470px)))] -translate-x-1/2 overflow-hidden md:top-[19svh] md:w-[min(36vw,60svh)]">
          {TRACKS.map((t, i) => (
            <Image
              key={t.n}
              src={`/demo/cover-${t.n}.jpg`}
              alt={`Portada de «${t.title}»`}
              fill
              sizes="(min-width: 768px) 36vw, 100vw"
              priority={i === 0}
              className={`object-cover transition-opacity duration-500 ${i === active ? 'drift opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-5 px-[var(--gutter)] pb-6 md:flex-row md:items-end md:justify-between md:pb-10">
          <div className="max-w-[30ch] space-y-4">
            <p className="text-body font-semibold leading-snug">
              Música publicada por quien la hace. Escúchala gratis o publica la tuya.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? `Pausar «${track.title}»` : `Escuchar «${track.title}»`}
                className="press grid h-12 w-12 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: track.ink, color: track.ground }}
              >
                {playing ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div className="min-w-0 text-small leading-tight">
                <p className="truncate font-semibold">
                  {track.title} · {track.genre}
                </p>
                <p className="opacity-75">
                  Compuesta y publicada por Aurevix Demo · pista de prueba
                </p>
              </div>
            </div>
            {/* La regla real de Aurevix: una escucha cuenta a los 30 s. */}
            <div aria-live="polite" className="text-small">
              <div
                className="h-1 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `${track.ink}26` }}
              >
                <div
                  className="h-full origin-left rounded-full"
                  style={{
                    backgroundColor: track.ink,
                    transform: `scaleX(${progress})`,
                    transition: 'transform 250ms linear',
                  }}
                />
              </div>
              <p className="mt-2 opacity-80">
                {counted
                  ? 'Esta escucha ya cuenta para el artista.'
                  : seconds > 0
                    ? `Cuenta como escucha en ${VALID_S - seconds} s.`
                    : `Una escucha cuenta a los ${VALID_S} s reales, no al darle al play.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#descargar"
              className="btn-primary"
              style={{ backgroundColor: track.ink, color: track.ground }}
            >
              Descargar la app
            </a>
            <a
              href="/app"
              className="press px-2 py-3 text-small font-semibold underline underline-offset-4"
            >
              Abrir en el navegador
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
