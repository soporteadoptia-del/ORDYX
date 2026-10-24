import { Card, Empty, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';

export default async function Errors() {
  await requireAdmin();
  const supabase = await serverClient();
  const { data } = await supabase.from('client_errors').select('*').order('created_at', { ascending: false }).limit(200);
  return (
    <>
      <PageTitle title="Errores de las apps" subtitle="Últimos 200 errores enviados por los clientes (sin datos sensibles)." />
      <Card>
        {(data ?? []).length === 0 ? <Empty>No hay errores registrados.</Empty> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {(data ?? []).map((e) => (
                <tr key={e.id} className="border-b border-line align-top">
                  <td className="whitespace-nowrap py-2 pr-4 text-muted">{new Date(e.created_at).toLocaleString('es-ES')}</td>
                  <td className="py-2 pr-4">
                    {e.app} {e.app_version} · {e.platform}
                  </td>
                  <td className="py-2 pr-4">{e.message}</td>
                  <td className="py-2 font-mono text-xs text-subtle">{JSON.stringify(e.context)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
