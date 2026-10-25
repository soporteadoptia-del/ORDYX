'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from '../Faq';

/**
 * «Índice de preguntas, una respuesta»: en escritorio la respuesta elegida se lee grande a la
 * derecha; en el móvil se abre debajo de su pregunta. La primera está elegida al cargar.
 */
export function FaqIndex() {
  const [selected, setSelected] = useState(0);
  return (
    <section
      id="preguntas"
      aria-labelledby="faq-title"
      className="mx-auto grid max-w-[1400px] scroll-mt-8 gap-10 px-[var(--gutter)] py-20 md:grid-cols-12 md:py-[16svh]"
    >
      <div className="md:col-span-5">
        <h2 id="faq-title" className="mb-8 text-title">
          Preguntas
        </h2>
        <ul className="space-y-1">
          {FAQ_ITEMS.map((item, i) => {
            const on = i === selected;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setSelected(i)}
                  onMouseEnter={() => setSelected(i)}
                  onFocus={() => setSelected(i)}
                  className={`flex w-full items-start gap-4 py-2.5 text-left text-body transition-colors ${on ? 'text-fg' : 'text-muted hover:text-fg'}`}
                >
                  <span
                    aria-hidden
                    className={`mt-[0.55em] h-2 w-2 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-subtle/60'}`}
                  />
                  <span>{item.q}</span>
                </button>
                {/* Móvil: la respuesta se abre debajo de su pregunta. */}
                <div
                  id={`faq-a-${i}`}
                  className={`pb-4 pl-6 text-body leading-relaxed md:hidden ${on ? '' : 'hidden'}`}
                >
                  {item.a}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="hidden md:col-span-6 md:col-start-7 md:block">
        <div
          key={selected}
          className="sticky top-32 max-w-[34ch] pt-[calc(var(--text-title)+2rem)] text-[24px] leading-[1.35] [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4"
          style={{ animation: 'faqIn 180ms var(--ease-out)' }}
        >
          {FAQ_ITEMS[selected]!.a}
        </div>
      </div>
      <style>{`@keyframes faqIn{from{opacity:0}to{opacity:1}}`}</style>
    </section>
  );
}
