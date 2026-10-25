'use client';

import { useActionState } from 'react';
import { input } from '@/components/ui';
import { signIn, signInWithGoogle } from './actions';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [error, action, pending] = useActionState(signIn, initialError ?? null);
  return (
    <div className="space-y-5">
      <form action={signInWithGoogle}>
        <button className="btn-google flex min-h-[50px] w-full items-center justify-center gap-3 rounded-full font-semibold">
          <GoogleIcon />
          Continuar con Google
        </button>
      </form>
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-subtle">
        <span className="h-px flex-1 bg-line" />o con tu correo
        <span className="h-px flex-1 bg-line" />
      </div>
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
          className="btn-primary min-h-[50px] w-full rounded-full font-semibold text-ink disabled:opacity-60"
        >
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

/** Logotipo «G» de Google con sus colores oficiales (requisito de su guía de marca para el botón). */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
