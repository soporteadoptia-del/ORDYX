import {
  formatDuration,
  LICENSE_LABELS,
  TRACK_STATUS_LABELS,
  TRACK_STATUSES,
  type TrackLicense,
  type TrackStatus,
} from '@ordyx/shared';
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
import { reviewTrack } from '../actions';

type Props = {
  searchParams: Promise<{ estado?: string; q?: string; ok?: string; error?: string }>;
};

export default async function Tracks({ searchParams }: Props) {
  await requireStaff();
  const sp = await searchParams;
  const status = (TRACK_STATUSES as readonly string[]).includes(sp.estado ?? '')
    ? (sp.estado as TrackStatus)
    : 'pending_review';
  const supabase = await serverClient();
  let query = supabase
    .from('tracks')
    .select(
      'id,title,status,description,duration_ms,audio_path,audio_mime,audio_size_bytes,license,rights_holder,rights_confirmed_at,review_note,is_demo,created_at,artist:artists(name,is_verified),owner:profiles(username)',
    )
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(50);
  if (sp.q) query = query.ilike('title', `%${sp.q.replace(/[%_]/g, '')}%`);
  const { data: tracks, error } = await query;

  // URLs firmadas de 10 minutos para escuchar antes de aprobar (el rol de moderación tiene acceso por RLS).
  const signed = new Map<string, string>();
  for (const t of tracks ?? []) {
    if (!t.audio_path) continue;
    const { data } = await supabase.storage.from('audio').createSignedUrl(t.audio_path, 600);
    if (data?.signedUrl) signed.set(t.id, data.signedUrl);
  }
  const back = `/canciones?estado=${status}`;

  return (
    <>
      <PageTitle
        title="Canciones"
        subtitle="Revisa que el audio y los metadatos sean correctos y que el contenido no infrinja derechos."
      />
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />
      <div className="mb-5 flex flex-wrap gap-2">
        {TRACK_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/canciones?estado=${s}`}
            className={`${btnGhost} ${s === status ? 'border-accent text-accent-strong' : ''}`}
          >
            {TRACK_STATUS_LABELS[s]}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="estado" value={status} />
          <input name="q" defaultValue={sp.q} placeholder="Buscar por título" className={input} />
        </form>
      </div>
      {(tracks ?? []).length === 0 ? <Empty>No hay canciones en este estado.</Empty> : null}
      <div className="space-y-4">
        {(tracks ?? []).map((t) => {
          const artist = t.artist as unknown as { name: string; is_verified: boolean } | null;
          const owner = t.owner as unknown as { username: string } | null;
          return (
            <Card key={t.id}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{t.title}</h2>
                    <Badge value={t.status} label={TRACK_STATUS_LABELS[t.status as TrackStatus]} />
                    {t.is_demo ? <Badge value="draft" label="demo" /> : null}
                  </div>
                  <p className="text-sm text-muted">
                    {artist?.name} {artist?.is_verified ? '✓' : ''} · subida por @{owner?.username}{' '}
                    · {formatDuration(t.duration_ms)} · {t.audio_mime ?? '—'} ·{' '}
                    {t.audio_size_bytes ? `${(t.audio_size_bytes / 1048576).toFixed(1)} MB` : '—'}
                  </p>
                  <p className="text-sm text-muted">
                    Licencia: {LICENSE_LABELS[t.license as TrackLicense] ?? t.license} · Titular:{' '}
                    {t.rights_holder ?? '—'} · Derechos confirmados:{' '}
                    {t.rights_confirmed_at
                      ? new Date(t.rights_confirmed_at).toLocaleString('es-ES')
                      : 'no'}
                  </p>
                  {t.description ? <p className="text-sm">{t.description}</p> : null}
                  {t.review_note ? (
                    <p className="text-sm text-warning">Nota anterior: {t.review_note}</p>
                  ) : null}
                  {signed.get(t.id) ? (
                    <audio
                      controls
                      preload="none"
                      src={signed.get(t.id)}
                      className="mt-2 w-full max-w-md"
                    />
                  ) : (
                    <p className="text-sm text-danger">Sin archivo de audio</p>
                  )}
                </div>
                <form action={reviewTrack} className="flex w-full flex-col gap-2 sm:w-72">
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="back" value={back} />
                  <input
                    name="note"
                    placeholder="Nota para el artista (opcional)"
                    className={input}
                  />
                  <div className="flex flex-wrap gap-2">
                    {t.status !== 'published' && t.status !== 'removed' ? (
                      <button name="decision" value="publish" className={btnPrimary}>
                        Publicar
                      </button>
                    ) : null}
                    {t.status === 'pending_review' || t.status === 'processing' ? (
                      <button name="decision" value="reject" className={btnGhost}>
                        Rechazar
                      </button>
                    ) : null}
                    {t.status !== 'removed' ? (
                      <button name="decision" value="remove" className={btnDanger}>
                        Retirar
                      </button>
                    ) : (
                      <button name="decision" value="restore" className={btnGhost}>
                        Devolver a revisión
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
