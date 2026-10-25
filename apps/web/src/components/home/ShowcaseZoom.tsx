'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/** Las tres distancias de la misma captura, cada una con lo que enseña. */
const STAGES = [
  {
    scale: 1,
    origin: '50% 50%',
    text: 'Tu inicio: favoritos, playlists y lo nuevo de los artistas, de un vistazo.',
  },
  {
    scale: 1.7,
    origin: '0% 12%',
    text: 'Accesos rápidos con su portada, como en las apps que ya usas.',
  },
  {
    scale: 2,
    origin: '0% 96%',
    text: 'El reproductor te sigue por toda la app y la música no se corta al bloquear el móvil.',
  },
] as const;

/**
 * «Un marco, tres distancias»: una captura real de la app queda fija y se acerca a dos detalles
 * a medida que se baja; a su lado cambia la frase que explica cada distancia.
 */
export function ShowcaseZoom() {
  const wrap = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(1, total)));
        const next = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
        setStage((prev) => (prev === next ? prev : next));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const s = STAGES[stage];
  return (
    <section
      ref={wrap}
      id="funciones"
      aria-labelledby="showcase-title"
      className="relative h-[240svh]"
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden px-[var(--gutter)]">
        <div className="mx-auto grid w-full max-w-[1400px] items-center gap-6 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <h2 id="showcase-title" className="text-title">
              Así suena en tu móvil
            </h2>
            <p
              key={stage}
              aria-live="polite"
              className="mt-6 max-w-[30ch] text-lead font-medium leading-[1.15] text-muted"
              style={{ animation: 'stageIn 450ms var(--ease-out)' }}
            >
              {s.text}
            </p>
            <div className="mt-8 hidden gap-2 md:flex" aria-hidden>
              {STAGES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-10 rounded-full transition-colors duration-300 ${i === stage ? 'bg-accent' : 'bg-fg/15'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-center md:col-span-7">
            <div className="relative aspect-[390/844] h-[min(56svh,640px)] overflow-hidden rounded-[32px] bg-surface md:h-[min(84svh,760px)]">
              <Image
                src="/screens/home-playing.webp"
                alt="Captura real de la app: inicio con accesos rápidos, playlists y el mini reproductor"
                fill
                sizes="(min-width: 768px) 360px, 60vw"
                className="object-cover"
                style={{
                  transform: `scale(${s.scale})`,
                  transformOrigin: s.origin,
                  transition: 'transform 800ms var(--ease-in-out)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes stageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}
