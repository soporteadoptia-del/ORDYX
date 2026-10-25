'use client';

import Image from 'next/image';
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/** Pantallas reales de la app (capturas de la versión web de la app), con lo que enseña cada una. */
const SCREENS = [
  {
    src: '/screens/app-home.webp',
    title: 'Inicio',
    text: 'Tus accesos rápidos y lo que suena esta semana, por géneros.',
  },
  {
    src: '/screens/app-player.webp',
    title: 'Reproductor',
    text: 'Letra, velocidad, temporizador para dormir y tu cola, a un toque.',
  },
  {
    src: '/screens/app-search.webp',
    title: 'Buscar',
    text: 'Canciones, artistas y playlists de Aurevix, y también de Audius.',
  },
  {
    src: '/screens/app-artist.webp',
    title: 'Artistas',
    text: 'Sus canciones más escuchadas, para seguirles y no perderte nada.',
  },
  {
    src: '/screens/app-plus.webp',
    title: 'Aurevix Plus',
    text: 'Todo lo que añade Plus, y el pago por Bizum paso a paso.',
  },
  {
    src: '/screens/app-stats.webp',
    title: 'Tus estadísticas',
    text: 'Minutos, tus canciones y artistas, y a qué hora escuchas más.',
  },
  {
    src: '/screens/app-studio.webp',
    title: 'Estudio',
    text: 'Para artistas: sube, revisa el estado y publica tu música.',
  },
];

const SPACING = 210;
const ROTATION = 38;
const DEPTH = 170;
const SCALE_STEP = 0.12;

/**
 * Coverflow de capturas (adaptado del «Coverflow Carousel» de 21st.dev, sin dependencias: CSS
 * transforms con ease-out). Se arrastra con el dedo, con las flechas del teclado o los botones.
 */
export function AppGallery() {
  const [active, setActive] = useState(0);
  const drag = useRef<{ x: number; t: number } | null>(null);
  const total = SCREENS.length;
  const go = useCallback((i: number) => setActive(Math.max(0, Math.min(total - 1, i))), [total]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(active + 1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(active - 1);
    }
  };
  const onDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, t: performance.now() };
  };
  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    const v = Math.abs(dx) / Math.max(1, performance.now() - d.t);
    // Un gesto rápido basta aunque sea corto (velocidad o distancia).
    if (dx < -60 || (dx < -12 && v > 0.4)) go(active + 1);
    else if (dx > 60 || (dx > 12 && v > 0.4)) go(active - 1);
  };

  const s = SCREENS[active];
  return (
    <section
      id="funciones"
      aria-labelledby="gallery-title"
      className="mx-auto max-w-[1400px] scroll-mt-8 overflow-hidden px-[var(--gutter)] py-20 md:py-[14svh]"
    >
      <div className="mb-6 grid gap-6 md:grid-cols-2 md:items-end">
        <h2 id="gallery-title" className="text-title">
          La app, por dentro
        </h2>
        <p className="max-w-[44ch] text-body text-muted">
          Pantallas reales de Aurevix Music. Desliza para verlas todas.
        </p>
      </div>
      <div
        role="region"
        aria-roledescription="carrusel"
        aria-label="Pantallas de la app"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (drag.current = null)}
        className="relative h-[min(78vw,560px)] touch-pan-y select-none rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-ink md:h-[600px]"
        style={{ perspective: 1200 }}
      >
        {SCREENS.map((sc, i) => {
          const off = i - active;
          if (Math.abs(off) > 3) return null;
          const scale = Math.max(1 - Math.abs(off) * SCALE_STEP, 0.5);
          return (
            <button
              key={sc.src}
              type="button"
              tabIndex={off === 0 ? -1 : 0}
              aria-hidden={off !== 0}
              aria-label={off === 0 ? undefined : `Ver ${sc.title}`}
              onClick={() => go(i)}
              className="coverflow-card absolute left-1/2 top-0 aspect-[390/844] h-full overflow-hidden rounded-[28px] bg-surface"
              style={{
                transform: `translateX(calc(-50% + ${off * SPACING}px)) translateZ(${-Math.abs(off) * DEPTH}px) rotateY(${-off * ROTATION}deg) scale(${scale})`,
                zIndex: total - Math.abs(off),
                opacity: Math.abs(off) === 3 ? 0 : 1,
              }}
            >
              <Image
                src={sc.src}
                alt={off === 0 ? `Pantalla «${sc.title}» de la app` : ''}
                fill
                sizes="(min-width: 768px) 280px, 60vw"
                className="pointer-events-none object-cover"
                draggable={false}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <p aria-live="polite" className="min-h-[3.5em] max-w-[36ch]">
          <span className="block font-display text-lead font-bold">{s.title}</span>
          <span className="text-body text-muted">{s.text}</span>
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Pantalla anterior"
            className="press grid h-12 w-12 place-items-center rounded-full bg-surface disabled:opacity-40"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              aria-hidden
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="text-small text-muted">
            {active + 1} de {total}
          </span>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === total - 1}
            aria-label="Pantalla siguiente"
            className="press grid h-12 w-12 place-items-center rounded-full bg-surface disabled:opacity-40"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              aria-hidden
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
