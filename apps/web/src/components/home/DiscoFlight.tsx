'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    mountScrollWorld?: (el: HTMLElement, config: unknown) => void;
  }
}

const V = '/disco';
const clip = (name: string) => ({
  clip: `${V}/vid/${name}.mp4`,
  clipMobile: `${V}/vid/${name}-m.mp4`,
  still: `${V}/still/${name}.webp`,
  stillMobile: `${V}/still/${name}-m.webp`,
});

interface Scene {
  id: string;
  label: string;
  clip: string;
  clipMobile: string;
  still: string;
  stillMobile: string;
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  tags: string[];
  linger?: number;
  cta?: { primary: { label: string; href: string }; secondary: { label: string; href: string } };
}

/** Tres escenas de un mismo plano: la funda, el disco de cerca y la app. */
const SECTIONS: Scene[] = [
  {
    id: 'disco',
    label: 'El disco',
    ...clip('dive0'),
    accent: '#c8f560',
    eyebrow: 'Aurevix Music',
    title: 'Música publicada por quien la hace.',
    body: 'Escúchala gratis y sin anuncios, o publica la tuya.',
    tags: ['Gratis', 'Sin anuncios', 'Android e iPhone'],
    linger: 0.3,
  },
  {
    id: 'sonido',
    label: 'El sonido',
    ...clip('dive1'),
    accent: '#c8f560',
    eyebrow: 'Aurevix Plus',
    title: 'Suena tal y como se grabó.',
    body: 'Con Plus escuchas el archivo original del artista, sin volver a comprimirlo, y te lo llevas sin conexión.',
    tags: ['4,99 € al mes', 'Sin permanencia'],
    linger: 0.3,
  },
  {
    id: 'app',
    label: 'La app',
    ...clip('dive2'),
    accent: '#c8f560',
    eyebrow: 'En tu bolsillo',
    title: 'Dale al play.',
    body: 'Tu música, tus playlists y lo que suena esta semana. En Android se instala desde aquí; en iPhone, desde Safari.',
    tags: [],
    cta: {
      primary: { label: 'Descargar la app', href: '#descargar' },
      secondary: { label: 'Abrir en el navegador', href: '/app' },
    },
  },
];

/**
 * Portada con scroll-world: un único plano de producto (la funda de Aurevix, el vinilo y la app)
 * renderizado por nosotros en 3D y guiado por el scroll; el scroll solo mueve el tiempo del vídeo.
 * Sin JavaScript, con «reducir movimiento» o mientras carga, se ven las tres escenas fijas.
 */
export function DiscoFlight() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    // Con «reducir movimiento» no hay vuelo: se quedan las seis escenas como página normal.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mount = () => {
      if (cancelled || !window.mountScrollWorld) return;
      el.replaceChildren();
      window.mountScrollWorld(el, {
        nav: false,
        hint: 'Baja para volar',
        diveScroll: 1.6,
        atmosphere: false,
        sections: SECTIONS,
      });
    };
    if (window.mountScrollWorld) mount();
    else {
      const s = document.createElement('script');
      s.src = `${V}/scrub-engine.js`;
      s.async = true;
      s.onload = mount;
      document.head.appendChild(s);
    }
    // Pasado el vuelo, sus capas fijas se ocultan: no asoman bajo el resto de la página y el
    // navegador deja de pintar los vídeos.
    const onScroll = () => {
      const bottom = el.getBoundingClientRect().bottom;
      const vh = window.innerHeight;
      el.classList.toggle('is-past', bottom < 0);
      // El texto se va mientras sube el resto de la página (de 1 a 0 en el último 35 % de pantalla).
      const left = Math.min(1, Math.max(0, (bottom - 0.65 * vh) / (0.35 * vh)));
      el.style.setProperty('--world-left', left.toFixed(3));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div ref={host} id="mundo" className="world-host">
      {/* Sin JavaScript, con «reducir movimiento» o mientras carga el motor: las seis escenas en
          orden, con su imagen y su texto. El motor las sustituye por el vuelo. */}
      {SECTIONS.map((sec, i) => (
        <section
          key={sec.id}
          aria-labelledby={`escena-${sec.id}`}
          className={`relative grid min-h-[100svh] items-end overflow-hidden md:items-center ${i === 0 ? '' : 'border-t border-line'}`}
        >
          <Image
            src={sec.still}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          <div className="relative bg-ink/80 px-[var(--gutter)] py-10 md:ml-[var(--gutter)] md:max-w-[560px] md:rounded-[28px] md:p-10">
            <p className="text-small font-semibold" style={{ color: sec.accent }}>
              {sec.eyebrow}
            </p>
            {i === 0 ? (
              <h1
                id={`escena-${sec.id}`}
                className="mt-3 font-display text-[clamp(40px,6vw,72px)] font-extrabold leading-[1.02]"
              >
                {sec.title}
              </h1>
            ) : (
              <h2
                id={`escena-${sec.id}`}
                className="mt-3 font-display text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.02]"
              >
                {sec.title}
              </h2>
            )}
            <p className="mt-4 max-w-[40ch] text-body text-muted">{sec.body}</p>
            {sec.cta ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={sec.cta.primary.href} className="btn-primary">
                  {sec.cta.primary.label}
                </a>
                <a href={sec.cta.secondary.href} className="btn-quiet">
                  {sec.cta.secondary.label}
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
