import Link from 'next/link';

const LINKS = [
  { href: '/ayuda', label: 'Ayuda' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/condiciones', label: 'Condiciones' },
  { href: '/aviso-legal', label: 'Aviso legal' },
  { href: '/derechos', label: 'Derechos de autor' },
];

/** Un cierre en una sola línea: qué es, los enlaces legales y el contacto. */
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
    <footer className="px-[var(--gutter)] pb-8 pt-[16svh] text-[15px]">
      <div className="mx-auto grid max-w-[1400px] gap-3 md:grid-cols-[1fr_auto_1fr] md:items-baseline md:gap-6">
        <p className="text-muted">{name} · música independiente</p>
        <nav aria-label="Legal y ayuda" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-accent">
              {l.label}
            </Link>
          ))}
          {Object.entries(socialLinks).map(([label, url]) => (
            <a
              key={label}
              href={url}
              rel="noopener noreferrer"
              target="_blank"
              className="capitalize transition-colors hover:text-accent"
            >
              {label}
            </a>
          ))}
        </nav>
        <p className="text-muted md:text-right">
          © 2026 ·{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="text-fg transition-colors hover:text-accent"
          >
            {supportEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}
