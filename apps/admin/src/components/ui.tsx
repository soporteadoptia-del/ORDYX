import type { ReactNode } from 'react';

export const btn =
  'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50';
export const btnPrimary = `${btn} btn-primary text-white`;
export const btnGhost = `${btn} border border-line hover:bg-elevated`;
export const btnDanger = `${btn} border border-danger/50 text-danger hover:bg-danger/10`;
export const input =
  'w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none';

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="flex-1">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  published: 'text-success border-success/40',
  active: 'text-success border-success/40',
  resolved: 'text-success border-success/40',
  pending_review: 'text-warning border-warning/40',
  open: 'text-warning border-warning/40',
  reviewing: 'text-warning border-warning/40',
  draft: 'text-muted border-line',
  processing: 'text-accent-strong border-accent/40',
  rejected: 'text-danger border-danger/40',
  removed: 'text-danger border-danger/40',
  withdrawn: 'text-danger border-danger/40',
  suspended: 'text-danger border-danger/40',
  dismissed: 'text-muted border-line',
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${TONES[value] ?? 'text-muted border-line'}`}
    >
      {label ?? value}
    </span>
  );
}

/** Mensajes de resultado de las acciones (?ok=… / ?error=…). */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`mb-5 rounded-xl border p-3 text-sm ${error ? 'border-danger/40 bg-danger/10 text-danger' : 'border-success/40 bg-success/10 text-success'}`}
    >
      {error ?? ok}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}
