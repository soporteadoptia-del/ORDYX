import { Card, Empty, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';

export default async function Audit() {
  await requireAdmin();
  const supabase = await serverClient();
  const { data: rows } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from('profiles').select('id,username').in('id', actorIds)
    : { data: [] };
  const names = new Map((actors ?? []).map((a) => [a.id, a.username as string]));
  return (
    <>
      <PageTitle
        title="Registro de auditoría"
        subtitle="Todas las acciones administrativas quedan registradas en la base de datos y no se pueden editar desde el panel."
      />
      <Card>
        {(rows ?? []).length === 0 ? <Empty>Sin acciones registradas.</Empty> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="border-b border-line align-top">
                  <td className="whitespace-nowrap py-2 pr-4 text-muted">
                    {new Date(r.created_at).toLocaleString('es-ES')}
                  </td>
                  <td className="py-2 pr-4">
                    {r.actor_id ? `@${names.get(r.actor_id) ?? r.actor_id.slice(0, 8)}` : 'sistema'}
                  </td>
                  <td className="py-2 pr-4 font-semibold">{r.action}</td>
                  <td className="py-2 pr-4 text-muted">
                    {r.target_type} {r.target_id?.slice(0, 8)}
                  </td>
                  <td className="py-2 font-mono text-xs text-subtle">
                    {JSON.stringify(r.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
