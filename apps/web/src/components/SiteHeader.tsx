import Link from 'next/link';
import { Wordmark } from './Logo';

export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur">
      <nav
        className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6"
        aria-label="Principal"
      >
        <Link href="/" aria-label={`${name}, inicio`}>
          <Wordmark name={name} size={32} />
        </Link>
        <div className="ml-auto hidden items-center gap-6 text-sm text-muted sm:flex">
          <Link href="/#funciones" className="hover:text-fg">
            Funciones
          </Link>
          <Link href="/#preguntas" className="hover:text-fg">
            Preguntas
          </Link>
          <Link href="/ayuda" className="hover:text-fg">
            Ayuda
          </Link>
        </div>
        <Link
          href="/#descargar"
          className="btn-primary ml-auto rounded-full px-4 py-2 text-sm font-semibold text-ink sm:ml-0"
        >
          Descargar
        </Link>
      </nav>
    </header>
  );
}
