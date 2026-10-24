import { LoginForm } from './LoginForm';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="aurora flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <h1 className="mb-1 text-xl font-extrabold">Administración de Ordyx</h1>
        <p className="mb-6 text-sm text-muted">Acceso restringido a cuentas con rol de administración o moderación.</p>
        <LoginForm initialError={error === 'sin-permisos' ? 'Tu cuenta no tiene permisos para el panel.' : undefined} />
      </div>
    </div>
  );
}
