import Link from 'next/link';
import { Card, Flash, PageTitle } from '@/components/ui';
import { requireStaff } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';

type Stats = Record<string, number> & {
  top_tracks_7d: { id: string; title: string; artist: string; plays: number }[];
};

const CARDS: [keyof Stats, string, string?][] = [
  ['users_total', 'Usuarios'],
  ['users_new_7d', 'Altas (7 días)'],
  ['active_users_1d', 'Activos (24 h)'],
  ['active_users_7d', 'Activos (7 días)'],
  ['active_users_30d', 'Activos (30 días)'],
  ['play_starts_1d', 'Inicios de reproducción (24 h)'],
  ['valid_plays_1d', 'Reproducciones válidas (24 h)'],
  ['valid_plays_7d', 'Reproducciones válidas (7 días)'],
  ['completed_plays_7d', 'Escuchas completas (7 días)'],
  ['tracks_published', 'Canciones publicadas'],
  ['tracks_pending', 'Pendientes de revisión', '/canciones?estado=pending_review'],
  ['reports_open', 'Denuncias abiertas', '/denuncias'],
  ['rights_claims_open', 'Reclamaciones de derechos', '/denuncias'],
  ['users_suspended', 'Cuentas suspendidas', '/usuarios'],
  ['errors_1d', 'Errores de cliente (24 h)', '/errores'],
];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const { error } = await searchParams;
  const supabase = await serverClient();
  const { data, error: statsError } = await supabase.rpc('admin_stats');
  const stats = data as Stats | null;
  return (
    <>
      <PageTitle
        title="Resumen"
        subtitle="Estadísticas agregadas. No se muestran datos de escucha individuales."
      />
      <Flash
        error={
          error === 'solo-administradores'
            ? 'Esa sección es solo para administradores.'
            : statsError?.message
        }
      />
      {stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {CARDS.map(([key, label, href]) => {
              const body = (
                <Card className="h-full">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {Number(stats[key] ?? 0).toLocaleString('es-ES')}
                  </p>
                </Card>
              );
              return href ? (
                <Link key={key} href={href} className="hover:opacity-90">
                  {body}
                </Link>
              ) : (
                <div key={key}>{body}</div>
              );
            })}
          </div>
          <Card className="mt-6">
            <h2 className="mb-3 font-bold">
              Canciones más escuchadas (7 días, reproducciones válidas)
            </h2>
            {stats.top_tracks_7d.length === 0 ? (
              <p className="text-sm text-muted">Sin datos todavía.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {stats.top_tracks_7d.map((t, i) => (
                  <li key={t.id} className="flex justify-between gap-4">
                    <span>
                      {i + 1}. {t.title} <span className="text-muted">· {t.artist}</span>
                    </span>
                    <span className="font-semibold">{t.plays}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <p className="mt-4 text-xs text-subtle">
            Una reproducción es válida cuando se escuchan al menos 30 s reales (o el 90 % si la
            canción es más corta); las repeticiones del mismo usuario en 5 minutos no vuelven a
            contar.
          </p>
        </>
      ) : null}
    </>
  );
}
