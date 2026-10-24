'use client';

import { useActionState } from 'react';
import { input } from '@/components/ui';
import { signIn } from './actions';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [error, action, pending] = useActionState(signIn, initialError ?? null);
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Correo</span>
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="btn-primary w-full rounded-lg py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
