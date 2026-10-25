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
import { requireAdmin } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';
import { grantPlus, reviewPlusPayment } from '../actions';

type Payment = {
  id: string;
  reference: string;
  amount_cents: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payer_note: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: { username: string; display_name: string | null } | null;
};

type Sub = {
  user_id: string;
  expires_at: string;
  source: 'bizum' | 'gift';
  user: { username: string } | null;
};

const STATUS: Record<Payment['status'], [string, string]> = {
  pending: ['pending_review', 'pendiente'],
  approved: ['active', 'aprobado'],
  rejected: ['rejected', 'rechazado'],
  cancelled: ['dismissed', 'cancelado'],
};

const euros = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  });

export default async function PlusPayments({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await serverClient();
  const [payments, subs, config] = await Promise.all([
    supabase
      .from('plus_payments')
      .select(
        'id,reference,amount_cents,status,payer_note,review_note,created_at,reviewed_at,user:profiles!plus_payments_user_id_fkey(username,display_name)',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('subscriptions')
      .select('user_id,expires_at,source,user:profiles!subscriptions_user_id_fkey(username)')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true }),
    supabase.from('app_config').select('key,value').eq('key', 'plus_bizum_phone').maybeSingle(),
  ]);
  const all = (payments.data ?? []) as unknown as Payment[];
  const pending = all.filter((p) => p.status === 'pending');
  const history = all.filter((p) => p.status !== 'pending');
  const active = (subs.data ?? []) as unknown as Sub[];
  const phone = String(config.data?.value ?? '602708111');

  return (
    <>
      <PageTitle
        title="Aurevix Plus"
        subtitle={`Los pagos llegan por Bizum al ${phone}. Antes de aprobar, comprueba en tu banco que hay un Bizum con el código exacto en el concepto y el importe correcto.`}
      />
      <Flash ok={sp.ok} error={sp.error ?? payments.error?.message} />

      <h2 className="mb-3 mt-2 font-display text-xl font-bold">
        Por revisar <span className="text-muted">({pending.length})</span>
      </h2>
      {pending.length === 0 ? <Empty>No hay pagos pendientes.</Empty> : null}
      <div className="space-y-3">
        {pending.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-2xl font-semibold text-accent">{p.reference}</p>
                <p className="mt-1 font-semibold">
                  @{p.user?.username ?? '—'}{' '}
                  {p.user?.display_name ? (
                    <span className="text-muted">· {p.user.display_name}</span>
                  ) : null}
                </p>
                <p className="text-sm text-muted">
                  {euros(p.amount_cents)} · pedido el {when(p.created_at)} ·{' '}
                  {p.payer_note ? (
                    <span className="text-warning">dice: «{p.payer_note}»</span>
                  ) : (
                    'aún no ha marcado el Bizum como enviado'
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={reviewPlusPayment}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="approve" value="true" />
                  <button className={btnPrimary}>Bizum recibido: activar</button>
                </form>
                <form action={reviewPlusPayment} className="flex gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="approve" value="false" />
                  <input
                    name="note"
                    required
                    placeholder="Motivo (lo verá el usuario)"
                    className={`${input} w-56`}
                  />
                  <button className={btnDanger}>Rechazar</button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold">Regalar Plus</h2>
      <Card>
        <form action={grantPlus} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Usuario</span>
            <input name="username" required placeholder="@usuario" className={`${input} w-48`} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Meses</span>
            <input
              name="months"
              type="number"
              min={1}
              max={24}
              defaultValue={1}
              className={`${input} w-24`}
            />
          </label>
          <label className="min-w-48 flex-1 text-sm">
            <span className="mb-1 block text-muted">Nota interna (opcional)</span>
            <input name="note" placeholder="Sorteo, artista invitado…" className={input} />
          </label>
          <button className={btnGhost}>Regalar</button>
        </form>
      </Card>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold">
        Suscripciones activas <span className="text-muted">({active.length})</span>
      </h2>
      {active.length === 0 ? <Empty>Nadie tiene Plus ahora mismo.</Empty> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {active.map((s) => (
              <tr key={s.user_id} className="border-b border-line">
                <td className="py-2 font-semibold">@{s.user?.username ?? '—'}</td>
                <td className="py-2 text-muted">hasta el {when(s.expires_at)}</td>
                <td className="py-2">
                  <Badge
                    value={s.source === 'gift' ? 'processing' : 'active'}
                    label={s.source === 'gift' ? 'regalo' : 'Bizum'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold">Historial</h2>
      {history.length === 0 ? <Empty>Sin movimientos todavía.</Empty> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {history.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="py-2 font-mono">{p.reference}</td>
                <td className="py-2">@{p.user?.username ?? '—'}</td>
                <td className="py-2 text-muted">{euros(p.amount_cents)}</td>
                <td className="py-2">
                  <Badge value={STATUS[p.status][0]} label={STATUS[p.status][1]} />
                </td>
                <td className="py-2 text-muted">
                  {p.reviewed_at ? when(p.reviewed_at) : when(p.created_at)}
                </td>
                <td className="py-2 text-muted">{p.review_note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
