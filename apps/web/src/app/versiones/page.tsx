import { formatBytes } from '@ordyx/shared';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getVersions, installUrl } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Historial de versiones',
  alternates: { canonical: '/versiones' },
};

const METHOD: Record<string, string> = {
  apk: 'APK',
  play_store: 'Google Play',
  testflight: 'TestFlight',
  app_store: 'App Store',
  web_distribution: 'Distribución web (UE)',
};

async function VersionList() {
  const { ok, history } = await getVersions();
  if (!ok)
    return <p className="text-warning">No se puede consultar el historial en este momento.</p>;
  if (history.length === 0)
    return <p className="text-muted">Aún no se ha publicado ninguna versión.</p>;
  return (
    <ol className="space-y-4">
      {history.map((v) => {
        const href = installUrl(v);
        return (
          <li key={v.id} className="rounded-2xl border border-line p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-bold">
                {v.platform === 'android' ? 'Android' : 'iOS'} {v.version}
              </h2>
              <span className="text-sm text-muted">
                compilación {v.build_number} · {v.channel === 'beta' ? 'beta' : 'estable'} ·{' '}
                {METHOD[v.install_method]}
                {v.published_at ? ` · ${new Date(v.published_at).toLocaleDateString('es-ES')}` : ''}
                {v.file_size_bytes ? ` · ${formatBytes(v.file_size_bytes)}` : ''}
              </span>
            </div>
            {v.release_notes ? (
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{v.release_notes}</p>
            ) : null}
            {v.sha256 ? (
              <code className="mt-2 block break-all text-xs text-subtle">SHA-256: {v.sha256}</code>
            ) : null}
            {href ? (
              <a
                className="mt-2 inline-block text-sm text-accent-strong underline"
                href={href}
                rel="noopener noreferrer"
              >
                {v.install_method === 'apk' ? 'Descargar este APK' : 'Abrir enlace de instalación'}
              </a>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function Versions() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-extrabold">Historial de versiones</h1>
      <p className="mb-8 text-muted">
        Solo se listan versiones publicadas. Las versiones retiradas por un defecto dejan de
        ofrecerse.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <VersionList />
      </Suspense>
    </div>
  );
}
