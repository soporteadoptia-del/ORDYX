import Link from 'next/link';
import { Wordmark } from './Logo';

export function SiteFooter({
  name,
  supportEmail,
  socialLinks,
}: {
  name: string;
  supportEmail: string;
  socialLinks: Record<string, string>;
}) {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <Wordmark name={name} size={28} />
          <p className="text-sm text-muted">Música independiente y tus playlists, en tu móvil.</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Producto</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/#descargar" className="hover:text-fg">
                Descargar
              </Link>
            </li>
            <li>
              <Link href="/versiones" className="hover:text-fg">
                Historial de versiones
              </Link>
            </li>
            <li>
              <Link href="/ayuda" className="hover:text-fg">
                Ayuda e instalación
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Legal</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/condiciones" className="hover:text-fg">
                Condiciones de uso
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-fg">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/aviso-legal" className="hover:text-fg">
                Aviso legal
              </Link>
            </li>
            <li>
              <Link href="/derechos" className="hover:text-fg">
                Reclamar derechos de autor
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Contacto</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <a href={`mailto:${supportEmail}`} className="hover:text-fg">
                {supportEmail}
              </a>
            </li>
            {Object.entries(socialLinks).map(([label, url]) => (
              <li key={label}>
                <a
                  href={url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="capitalize hover:text-fg"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="pb-10 text-center text-xs text-subtle">
        © {name}. Los nombres de terceros pertenecen a sus titulares.
      </p>
    </footer>
  );
}
