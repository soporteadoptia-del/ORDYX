'use client';

import { detectDevice, type DetectedDevice } from '@ordyx/shared';
import { useState, useSyncExternalStore } from 'react';
import type { PlatformOffer } from './DownloadSection';

const subscribe = () => () => undefined;
const getDevice = (): DetectedDevice => detectDevice(navigator.userAgent, navigator.maxTouchPoints);
const getServerDevice = (): DetectedDevice => 'unknown';

/**
 * Detecta el dispositivo de forma orientativa para destacar el botón adecuado. Nunca bloquea:
 * el usuario siempre puede elegir la otra plataforma manualmente.
 */
export function PlatformPicker({ android, ios, backendOk, qrSvg }: { android: PlatformOffer; ios: PlatformOffer; backendOk: boolean; qrSvg: string }) {
  const detected = useSyncExternalStore(subscribe, getDevice, getServerDevice);
  const [manual, setManual] = useState<'android' | 'ios' | null>(null);
  const selected = manual ?? (detected === 'ios' ? 'ios' : detected === 'android' ? 'android' : null);

  return (
    <div className="space-y-6">
      {!backendOk ? (
        <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Ahora mismo no podemos comprobar qué versiones están publicadas. No mostramos enlaces sin verificar: vuelve a intentarlo en unos minutos.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>
          {detected === 'unknown'
            ? 'Elige tu dispositivo:'
            : detected === 'desktop'
              ? 'Estás en un ordenador. Abre esta página en tu móvil o elige tu dispositivo:'
              : `Hemos detectado ${detected === 'ios' ? 'un iPhone o iPad' : 'un dispositivo Android'}. ¿No es correcto?`}
        </span>
        <div role="tablist" aria-label="Plataforma" className="inline-flex rounded-full border border-line p-1">
          {(['android', 'ios'] as const).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={selected === p}
              onClick={() => setManual(p)}
              className={`rounded-full px-4 py-1.5 font-medium transition ${selected === p ? 'bg-fg text-ink' : 'text-muted hover:text-fg'}`}
            >
              {p === 'android' ? 'Android' : 'iPhone / iPad'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PlatformCard platform="android" offer={android} highlighted={selected === 'android'} dimmed={selected === 'ios'} />
        <PlatformCard platform="ios" offer={ios} highlighted={selected === 'ios'} dimmed={selected === 'android'} />
      </div>

      {detected === 'desktop' ? (
        <div className="glass flex items-center gap-5 rounded-2xl p-5">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-white p-1" aria-hidden dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="text-sm text-muted">
            Escanea el código con la cámara de tu móvil para abrir esta página allí y descargar la app.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PlatformCard({ platform, offer, highlighted, dimmed }: { platform: 'android' | 'ios'; offer: PlatformOffer; highlighted: boolean; dimmed: boolean }) {
  const name = platform === 'android' ? 'Android' : 'iPhone y iPad';
  return (
    <section
      aria-labelledby={`card-${platform}`}
      className={`relative rounded-[var(--radius-card)] border p-6 transition ${
        highlighted ? 'border-accent bg-elevated shadow-2xl shadow-accent/20' : 'border-line bg-surface'
      } ${dimmed ? 'opacity-80' : ''}`}
    >
      {highlighted ? (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">Recomendado para ti</span>
      ) : null}
      <h3 id={`card-${platform}`} className="text-xl font-bold">
        {name}
      </h3>

      {offer.available && offer.href ? (
        <>
          <a
            href={offer.href}
            rel={offer.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-lg font-bold text-white shadow-lg shadow-accent/30"
          >
            {offer.label}
          </a>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-subtle">Versión</dt>
            <dd>{offer.version}</dd>
            {offer.sizeLabel ? (
              <>
                <dt className="text-subtle">Tamaño</dt>
                <dd>{offer.sizeLabel}</dd>
              </>
            ) : null}
            {offer.minOs ? (
              <>
                <dt className="text-subtle">Requiere</dt>
                <dd>
                  {platform === 'android' ? 'Android' : 'iOS'} {offer.minOs} o superior
                </dd>
              </>
            ) : null}
            {offer.publishedAt ? (
              <>
                <dt className="text-subtle">Publicada</dt>
                <dd>{new Date(offer.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              </>
            ) : null}
          </dl>
          {offer.notes ? <p className="mt-3 line-clamp-3 text-sm text-muted">{offer.notes}</p> : null}
          <InstallSteps platform={platform} method={offer.method} />
          {offer.sha256 ? (
            <details className="mt-3 text-xs text-subtle">
              <summary className="cursor-pointer">Verificar el archivo (SHA-256)</summary>
              <code className="mt-2 block break-all">{offer.sha256}</code>
            </details>
          ) : null}
          {offer.beta ? (
            <a href={offer.beta.href} className="mt-3 inline-block text-sm text-accent-strong underline">
              Probar la versión beta {offer.beta.version}
            </a>
          ) : null}
        </>
      ) : (
        <>
          <button disabled className="mt-5 w-full cursor-not-allowed rounded-full border border-line px-6 py-4 text-lg font-semibold text-subtle">
            {platform === 'android' ? 'Descargar para Android' : 'Instalar en iPhone'}
          </button>
          <p className="mt-3 text-sm text-muted">
            {platform === 'android'
              ? 'Todavía no hay una versión de Android publicada. Cuando esté verificada aparecerá aquí con su número de versión y tamaño.'
              : 'Todavía no hay una versión de iPhone disponible. Se publicará primero mediante TestFlight (beta pública de Apple) y después en el App Store.'}
          </p>
        </>
      )}
    </section>
  );
}

function InstallSteps({ platform, method }: { platform: 'android' | 'ios'; method: PlatformOffer['method'] }) {
  if (platform === 'android' && method === 'apk') {
    return (
      <details className="mt-4 rounded-xl bg-ink/60 p-3 text-sm">
        <summary className="cursor-pointer font-medium">¿Cómo se instala?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Pulsa «Descargar para Android» y espera a que termine la descarga.</li>
          <li>Abre el archivo descargado desde la notificación o la carpeta Descargas.</li>
          <li>
            Si Android te pide permiso, pulsa <strong>Ajustes</strong> y activa <strong>Permitir de esta fuente</strong> para tu navegador. Vuelve atrás.
          </li>
          <li>Pulsa <strong>Instalar</strong> y después <strong>Abrir</strong>. Ya puedes registrarte o iniciar sesión.</li>
        </ol>
        <p className="mt-2 text-xs text-subtle">Android siempre muestra una confirmación al instalar apps fuera de Google Play; es normal.</p>
      </details>
    );
  }
  if (platform === 'ios' && method === 'testflight') {
    return (
      <details className="mt-4 rounded-xl bg-ink/60 p-3 text-sm" open>
        <summary className="cursor-pointer font-medium">¿Cómo se instala?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Pulsa «Instalar en iPhone». Si no tienes la app TestFlight de Apple, el enlace te llevará a instalarla (gratis).</li>
          <li>Vuelve a esta página y pulsa de nuevo el botón: TestFlight mostrará «Aceptar» y luego «Instalar».</li>
          <li>Abre la app desde tu pantalla de inicio y regístrate o inicia sesión.</li>
        </ol>
        <p className="mt-2 text-xs text-subtle">TestFlight es el programa oficial de pruebas de Apple. Las versiones de prueba caducan a los 90 días; la app se actualiza desde TestFlight.</p>
      </details>
    );
  }
  return null;
}
