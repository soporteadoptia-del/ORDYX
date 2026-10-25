import Image from 'next/image';
import { LoginForm } from './LoginForm';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="aurora flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[18px] border border-line bg-surface p-8">
        <Image src="/logo-a.png" width={54} height={54} alt="" className="mx-auto mb-4" priority />
        <p className="eyebrow mb-2">Panel interno</p>
        <h1 className="mb-1 text-2xl font-bold">Administración de Aurevix Music</h1>
        <p className="mb-6 text-sm text-muted">
          Acceso restringido a cuentas con rol de administración o moderación.
        </p>
        <LoginForm
          initialError={
            error === 'sin-permisos'
              ? 'Tu cuenta no tiene permisos para el panel.'
              : error === 'google'
                ? 'No se ha podido iniciar sesión con Google. Inténtalo de nuevo.'
                : undefined
          }
        />
      </div>
    </div>
  );
}
