import { btnGhost, btnPrimary, Card, Flash, input, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';
import { setConfig } from '../actions';

export default async function Config({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await serverClient();
  const { data: rows } = await supabase.from('app_config').select('*').order('key');
  return (
    <>
      <PageTitle
        title="Configuración de la plataforma"
        subtitle="Valores en JSON. Las claves «públicas» las leen la web y la app; las demás solo el servidor y el panel."
      />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="space-y-3">
        {(rows ?? []).map((r) => (
          <Card key={r.key}>
            <form action={setConfig} className="space-y-2">
              <input type="hidden" name="key" value={r.key} />
              <div className="flex flex-wrap items-center gap-3">
                <code className="font-semibold">{r.key}</code>
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input type="checkbox" name="is_public" defaultChecked={r.is_public} /> pública
                </label>
              </div>
              {r.description ? <p className="text-xs text-muted">{r.description}</p> : null}
              <div className="flex gap-2">
                <input
                  name="value"
                  defaultValue={JSON.stringify(r.value)}
                  className={`${input} font-mono`}
                />
                <button className={btnGhost}>Guardar</button>
              </div>
            </form>
          </Card>
        ))}
        <Card>
          <form action={setConfig} className="flex flex-wrap gap-2">
            <input
              name="key"
              placeholder="nueva_clave"
              pattern="[a-z0-9_.]{2,60}"
              required
              className={`${input} max-w-xs`}
            />
            <input
              name="value"
              placeholder='"valor" o {"json": true}'
              required
              className={`${input} max-w-md font-mono`}
            />
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" name="is_public" /> pública
            </label>
            <button className={btnPrimary}>Añadir</button>
          </form>
        </Card>
      </div>
    </>
  );
}
