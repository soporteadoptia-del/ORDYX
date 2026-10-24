import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Cuenta confirmada', robots: { index: false } };

export default function Confirmed() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="mb-4 text-3xl font-extrabold">¡Correo confirmado!</h1>
      <p className="text-muted">Ya puedes volver a la app e iniciar sesión con tu correo y contraseña.</p>
      <p className="mt-6 text-sm text-muted">
        ¿Aún no tienes la app? <Link className="text-accent-strong underline" href="/#descargar">Descárgala aquí</Link>.
      </p>
    </div>
  );
}
