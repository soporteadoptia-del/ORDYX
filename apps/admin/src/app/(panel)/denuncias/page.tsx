import { REPORT_REASON_LABELS, type ReportReason } from '@ordyx/shared';
import Link from 'next/link';
import {
  Badge,
  btnDanger,
  btnGhost,
  btnPrimary,
  Card,
  Empty,
  Flash,
  input,
  PageTitle,
} from '@/components/ui';
import { requireStaff } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';
import { hideComment, resolveClaim, resolveReport, reviewTrack } from '../actions';

export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ todas?: string; ok?: string; error?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const all = sp.todas === '1';
  const supabase = await serverClient();
  let rq = supabase
    .from('reports')
    .select('*,reporter:profiles!reports_reporter_id_fkey(username)')
    .order('created_at')
    .limit(100);
  let cq = supabase.from('rights_claims').select('*').order('created_at').limit(100);
  if (!all) {
    rq = rq.in('status', ['open', 'reviewing']);
    cq = cq.in('status', ['open', 'reviewing']);
  }
  const [{ data: reports, error }, { data: claims }] = await Promise.all([rq, cq]);

  // Contexto de los comentarios denunciados.
  const commentIds = (reports ?? [])
    .filter((r) => r.target_type === 'comment')
    .map((r) => r.target_id);
  const { data: comments } = commentIds.length
    ? await supabase
        .from('comments')
        .select('id,body,is_hidden,track_id,author:profiles(username)')
        .in('id', commentIds)
    : { data: [] };
  const commentMap = new Map((comments ?? []).map((c) => [c.id, c]));

  return (
    <>
      <PageTitle
        title="Denuncias y reclamaciones"
        subtitle="Tramita cada aviso y deja constancia del motivo: el usuario que denunció recibe una notificación."
        actions={
          <Link className={btnGhost} href={all ? '/denuncias' : '/denuncias?todas=1'}>
            {all ? 'Solo abiertas' : 'Ver todas'}
          </Link>
        }
      />
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />

      <h2 className="mb-3 mt-2 text-lg font-bold">
        Reclamaciones de derechos ({claims?.length ?? 0})
      </h2>
      {(claims ?? []).length === 0 ? <Empty>Sin reclamaciones.</Empty> : null}
      <div className="space-y-3">
        {(claims ?? []).map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap gap-2">
              <Badge value={c.status} />
              <span className="text-sm text-muted">
                {new Date(c.created_at).toLocaleString('es-ES')}
              </span>
            </div>
            <p className="mt-2 text-sm">
              <strong>{c.claimant_name}</strong> &lt;{c.claimant_email}&gt;
            </p>
            <p className="text-sm text-muted">
              Contenido:{' '}
              <a
                className="underline"
                href={c.content_url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {c.content_url}
              </a>
            </p>
            <p className="text-sm text-muted">Obra: {c.original_work}</p>
            <p className="mt-1 whitespace-pre-line text-sm">{c.details}</p>
            {c.track_id ? (
              <form action={reviewTrack} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={c.track_id} />
                <input type="hidden" name="back" value="/denuncias" />
                <input type="hidden" name="note" value="Retirada por reclamación de derechos" />
                <button name="decision" value="remove" className={btnDanger}>
                  Retirar la canción enlazada
                </button>
              </form>
            ) : null}
            <form action={resolveClaim} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input
                name="note"
                placeholder="Resolución / respuesta"
                className={`${input} max-w-md`}
              />
              <button name="status" value="reviewing" className={btnGhost}>
                En revisión
              </button>
              <button name="status" value="resolved" className={btnPrimary}>
                Resuelta
              </button>
              <button name="status" value="dismissed" className={btnGhost}>
                Desestimar
              </button>
            </form>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">
        Denuncias de usuarios ({reports?.length ?? 0})
      </h2>
      {(reports ?? []).length === 0 ? <Empty>Sin denuncias.</Empty> : null}
      <div className="space-y-3">
        {(reports ?? []).map((r) => {
          const comment = commentMap.get(r.target_id);
          const reporter = r.reporter as unknown as { username: string } | null;
          return (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={r.status} />
                <span className="font-semibold">
                  {REPORT_REASON_LABELS[r.reason as ReportReason]}
                </span>
                <span className="text-sm text-muted">
                  · {r.target_type} · por @{reporter?.username ?? 'cuenta eliminada'} ·{' '}
                  {new Date(r.created_at).toLocaleString('es-ES')}
                </span>
              </div>
              {r.details ? <p className="mt-2 text-sm">{r.details}</p> : null}
              {r.target_type === 'track' ? (
                <p className="mt-2 text-sm">
                  <Link
                    className="text-accent-strong underline"
                    href={`/canciones?estado=published&q=`}
                  >
                    Canción {r.target_id.slice(0, 8)}
                  </Link>
                </p>
              ) : null}
              {comment ? (
                <div className="mt-2 rounded-lg bg-elevated p-3 text-sm">
                  <p className="text-muted">
                    @{(comment.author as unknown as { username: string } | null)?.username}:
                  </p>
                  <p>{comment.body}</p>
                  <form action={hideComment} className="mt-2">
                    <input type="hidden" name="id" value={comment.id} />
                    <input type="hidden" name="hidden" value={String(!comment.is_hidden)} />
                    <input type="hidden" name="reason" value={`Denuncia: ${r.reason}`} />
                    <button className={comment.is_hidden ? btnGhost : btnDanger}>
                      {comment.is_hidden ? 'Volver a mostrar' : 'Ocultar comentario'}
                    </button>
                  </form>
                </div>
              ) : null}
              {r.target_type === 'track' ? (
                <form action={reviewTrack} className="mt-2">
                  <input type="hidden" name="id" value={r.target_id} />
                  <input type="hidden" name="back" value="/denuncias" />
                  <input type="hidden" name="note" value={`Retirada tras denuncia (${r.reason})`} />
                  <button name="decision" value="remove" className={btnDanger}>
                    Retirar canción
                  </button>
                </form>
              ) : null}
              <form action={resolveReport} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input
                  name="note"
                  placeholder="Nota de resolución"
                  className={`${input} max-w-md`}
                />
                <button name="status" value="reviewing" className={btnGhost}>
                  En revisión
                </button>
                <button name="status" value="resolved" className={btnPrimary}>
                  Resuelta
                </button>
                <button name="status" value="dismissed" className={btnGhost}>
                  Desestimar
                </button>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
