'use client';

import { useEffect } from 'react';

/**
 * Marca con `is-in` cada bloque `[data-reveal]` cuando entra en pantalla, una sola vez, para que
 * sus partes (título, texto, imagen) aparezcan escalonadas. Sin JS el contenido se ve igual.
 */
export function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
  return null;
}
