import type { ReactNode } from 'react';

/** Plantilla de páginas legales con aviso explícito de revisión profesional pendiente. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-extrabold">{title}</h1>
      <p className="mb-6 text-sm text-subtle">Última actualización: {updated}</p>
      <div role="note" className="mb-8 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
        Borrador de trabajo. Este texto debe revisarlo un profesional jurídico y completarse con los datos del titular antes del lanzamiento
        público. Incluir esta página no garantiza el cumplimiento de la normativa.
      </div>
      <div className="prose-legal">{children}</div>
    </article>
  );
}
