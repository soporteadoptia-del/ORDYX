'use client';

import { useActionState } from 'react';
import { submitClaim, type ClaimState } from './actions';

const field =
  'w-full rounded-xl border border-line bg-elevated px-4 py-3 text-fg placeholder:text-subtle focus:border-accent focus:outline-none';

export function ClaimForm() {
  const [state, action, pending] = useActionState<ClaimState, FormData>(submitClaim, {
    status: 'idle',
  });

  if (state.status === 'ok') {
    return (
      <div role="status" className="rounded-2xl border border-success/40 bg-success/10 p-6">
        <p className="font-semibold text-success">{state.message}</p>
        {state.reference ? (
          <p className="mt-1 text-sm text-muted">
            Referencia: {state.reference}. Te responderemos al correo indicado.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted">Nombre o entidad titular</span>
          <input
            name="claimant_name"
            required
            maxLength={200}
            className={field}
            autoComplete="name"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Correo de contacto</span>
          <input
            name="claimant_email"
            type="email"
            required
            maxLength={254}
            className={field}
            autoComplete="email"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">
          Enlace al contenido en Aurevix Music (p. ej. https://ordyx.vercel.app/t/…)
        </span>
        <input name="content_url" required maxLength={500} className={field} inputMode="url" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Obra protegida (título, autor, enlace o registro)</span>
        <input name="original_work" required maxLength={1000} className={field} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Explicación de la reclamación</span>
        <textarea
          name="details"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className={field}
        />
      </label>
      {/* Trampa anti-bots: oculta para personas y lectores de pantalla */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="good_faith" className="mt-1 h-4 w-4 accent-[#8b5cf6]" />
        <span>
          Declaro de buena fe que el uso denunciado no está autorizado por el titular de los
          derechos, su representante o la ley, y que la información facilitada es exacta. Soy el
          titular o estoy autorizado para actuar en su nombre.
        </span>
      </label>
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary rounded-full px-8 py-3 font-bold text-ink disabled:opacity-60"
      >
        {pending ? 'Enviando…' : 'Enviar reclamación'}
      </button>
    </form>
  );
}
