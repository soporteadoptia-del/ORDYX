import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="mb-3 text-3xl font-extrabold">No encontramos esta página</h1>
      <p className="text-muted">
        El enlace puede estar mal escrito, o el contenido ya no está disponible o es privado.
      </p>
      <Link href="/" className="mt-6 inline-block text-accent-strong underline">
        Volver al inicio
      </Link>
    </div>
  );
}
