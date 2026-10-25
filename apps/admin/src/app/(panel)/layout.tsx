import Image from 'next/image';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { signOut } from '../login/actions';

const NAV: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: '/', label: 'Resumen' },
  { href: '/canciones', label: 'Canciones' },
  { href: '/denuncias', label: 'Denuncias y derechos' },
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/plus', label: 'Aurevix Premium', adminOnly: true },
  { href: '/artistas', label: 'Artistas y álbumes', adminOnly: true },
  { href: '/generos', label: 'Géneros', adminOnly: true },
  { href: '/versiones', label: 'Versiones de la app', adminOnly: true },
  { href: '/configuracion', label: 'Configuración', adminOnly: true },
  { href: '/errores', label: 'Errores', adminOnly: true },
  { href: '/auditoria', label: 'Auditoría', adminOnly: true },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-surface md:w-64 md:border-b-0 md:border-r">
        <div className="p-5">
          <p className="flex items-center gap-2 font-display font-extrabold uppercase">
            <Image src="/logo-a.png" width={26} height={26} alt="" />
            Aurevix<span className="text-accent">Admin</span>
          </p>
          <p className="truncate text-xs text-muted">{session.email}</p>
          <p className="text-xs text-accent-strong">
            {session.isAdmin ? 'Administración' : 'Moderación'}
          </p>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible"
          aria-label="Secciones"
        >
          {NAV.filter((n) => !n.adminOnly || session.isAdmin).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted hover:bg-elevated hover:text-fg"
            >
              {n.label}
            </Link>
          ))}
          <form action={signOut} className="md:mt-4">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
              Cerrar sesión
            </button>
          </form>
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
