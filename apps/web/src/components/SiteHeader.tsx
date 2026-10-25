import Link from 'next/link';
import { Wordmark } from './Logo';

/** Barra simple: marca, tres enlaces y una acción. Sin borde, sin desenfoque. */
export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="relative z-[80]">
      <nav
        className="mx-auto flex max-w-[1400px] items-center gap-8 px-[var(--gutter)] py-4"
        aria-label="Principal"
      >
        <Link href="/" aria-label={`${name}, inicio`} className="press">
          <Wordmark name={name} size={30} />
        </Link>
        <div className="ml-auto hidden items-center gap-7 text-[15px] font-medium text-muted md:flex">
          <Link href="/#suena" className="transition-colors hover:text-fg">
            Suena ahora
          </Link>
          <Link href="/#funciones" className="transition-colors hover:text-fg">
            La app
          </Link>
          <Link href="/#artistas" className="transition-colors hover:text-fg">
            Para artistas
          </Link>
          <Link href="/#plus" className="transition-colors hover:text-fg">
            Plus
          </Link>
          <Link href="/#preguntas" className="transition-colors hover:text-fg">
            Preguntas
          </Link>
        </div>
        <Link
          href="/#descargar"
          className="btn-primary ml-auto min-h-[44px] px-5 text-[15px] md:ml-0"
        >
          Descargar
        </Link>
      </nav>
    </header>
  );
}
