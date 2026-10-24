import { formatBytes } from '@ordyx/shared';
import { Badge, btnDanger, btnGhost, btnPrimary, Card, Empty, Flash, input, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';
import { publishVersion, saveVersion, verifyVersion, withdrawVersion } from '../actions';
import { ReleaseUploader } from './ReleaseUploader';

const METHOD_LABEL: Record<string, string> = {
  apk: 'APK directo',
  play_store: 'Google Play',
  testflight: 'TestFlight (enlace público)',
  app_store: 'App Store',
  web_distribution: 'Distribución web UE (requiere aprobación de Apple)',
};

export default async function Versions({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await serverClient();
  const { data: versions } = await supabase.from('app_versions').select('*').order('created_at', { ascending: false }).limit(100);

  return (
    <>
      <PageTitle
        title="Versiones de la app"
        subtitle="Flujo: borrador → verificación (el servidor descarga el archivo y comprueba SHA-256 y tamaño) → publicación. La web solo muestra versiones publicadas."
      />
      <Flash ok={sp.ok} error={sp.error} />

      <Card className="mb-8">
        <h2 className="mb-3 font-bold">Nueva versión (borrador)</h2>
        <ReleaseUploader />
        <form id="new-version" action={saveVersion} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted">Plataforma</span>
            <select name="platform" className={input} defaultValue="android">
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Canal</span>
            <select name="channel" className={input} defaultValue="stable">
              <option value="stable">Estable</option>
              <option value="beta">Beta</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Método de instalación</span>
            <select name="install_method" className={input} defaultValue="apk">
              {Object.entries(METHOD_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Versión (MAJOR.MINOR.PATCH)</span>
            <input name="version" required placeholder="1.0.0" className={input} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Número de compilación</span>
            <input name="build_number" type="number" min={1} required className={input} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Sistema mínimo</span>
            <input name="min_os_version" placeholder="7.0 / 15.1" className={input} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-muted">URL HTTPS de descarga o instalación (APK externo, enlace público de TestFlight, App Store o Play Store)</span>
            <input name="download_url" placeholder="https://…" className={input} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">o ruta en el bucket «releases»</span>
            <input name="storage_path" className={input} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">Tamaño (bytes, obligatorio para APK)</span>
            <input name="file_size_bytes" type="number" className={input} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted">SHA-256 (obligatorio para APK)</span>
            <input name="sha256" className={`${input} font-mono`} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-muted">Notas de la versión</span>
            <textarea name="release_notes" rows={3} className={input} />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button className={btnPrimary}>Guardar borrador</button>
          </div>
        </form>
      </Card>

      {(versions ?? []).length === 0 ? <Empty>Aún no hay versiones.</Empty> : null}
      <div className="space-y-3">
        {(versions ?? []).map((v) => (
          <Card key={v.id}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold">
                {v.platform === 'android' ? 'Android' : 'iOS'} {v.version} ({v.build_number})
              </h3>
              <Badge value={v.status} />
              <Badge value="draft" label={v.channel} />
              <span className="text-sm text-muted">{METHOD_LABEL[v.install_method]}</span>
              {v.verified_at ? <Badge value="published" label="verificada" /> : <Badge value="pending_review" label="sin verificar" />}
            </div>
            <p className="mt-1 break-all text-xs text-muted">
              {v.download_url ?? `releases/${v.storage_path}`} · {formatBytes(v.file_size_bytes)} {v.sha256 ? `· SHA-256 ${v.sha256}` : ''}
            </p>
            {v.withdrawn_reason ? <p className="text-sm text-danger">Retirada: {v.withdrawn_reason}</p> : null}
            <div className="mt-3 flex flex-wrap gap-3">
              {v.status === 'draft' ? (
                <form action={verifyVersion} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="install_tested" required /> He instalado y abierto esta versión en un dispositivo real
                  </label>
                  <button className={btnGhost}>Verificar</button>
                </form>
              ) : null}
              {v.status === 'draft' && v.verified_at ? (
                <form action={publishVersion}>
                  <input type="hidden" name="id" value={v.id} />
                  <button className={btnPrimary}>Publicar</button>
                </form>
              ) : null}
              {v.status === 'published' ? (
                <form action={withdrawVersion} className="flex gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input name="reason" required minLength={3} placeholder="Motivo de la retirada" className={`${input} w-64`} />
                  <button className={btnDanger}>Retirar</button>
                </form>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
