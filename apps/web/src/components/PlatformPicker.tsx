'use client';

import { detectDevice, type DetectedDevice } from '@ordyx/shared';
import { useState, useSyncExternalStore } from 'react';
import type { PlatformOffer } from '@/lib/offers';

const subscribe = () => () => undefined;
const getDevice = (): DetectedDevice => detectDevice(navigator.userAgent, navigator.maxTouchPoints);
const getServerDevice = (): DetectedDevice => 'unknown';

/**
 * Detecta el dispositivo de forma orientativa para destacar el botón adecuado. Nunca bloquea:
 * el usuario siempre puede elegir la otra plataforma manualmente.
 */
export function PlatformPicker({
  android,
  ios,
  backendOk,
  qrSvg,
}: {
  android: PlatformOffer;
  ios: PlatformOffer;
  backendOk: boolean;
  qrSvg: string;
}) {
  const detected = useSyncExternalStore(subscribe, getDevice, getServerDevice);
  const [manual, setManual] = useState<'android' | 'ios' | null>(null);
  const selected =
    manual ?? (detected === 'ios' ? 'ios' : detected === 'android' ? 'android' : null);

  return (
    <div className="space-y-6">
      {!backendOk ? (
        <p role="status" className="rounded-xl bg-warning/10 p-4 text-[15px] text-warning">
          Ahora mismo no podemos comprobar qué versiones están publicadas. No mostramos enlaces sin
          verificar: vuelve a intentarlo en unos minutos.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-[15px] text-muted">
        <span>
          {detected === 'unknown'
            ? 'Elige tu dispositivo:'
            : detected === 'desktop'
              ? 'Estás en un ordenador. Abre esta página en tu móvil o elige tu dispositivo:'
              : `Hemos detectado ${detected === 'ios' ? 'un iPhone o iPad' : 'un dispositivo Android'}. ¿No es correcto?`}
        </span>
        <div
          role="tablist"
          aria-label="Plataforma"
          className="inline-flex rounded-full bg-surface p-1"
        >
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
        <PlatformCard
          platform="android"
          offer={android}
          highlighted={selected === 'android'}
          dimmed={selected === 'ios'}
        />
        <PlatformCard
          platform="ios"
          offer={ios}
          highlighted={selected === 'ios'}
          dimmed={selected === 'android'}
        />
      </div>

      {detected === 'desktop' ? (
        <div className="flex items-center gap-5 rounded-2xl bg-surface p-5">
          <div
            className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-white p-1"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="text-[15px] text-muted">
            Escanea el código con la cámara de tu móvil para abrir esta página allí y descargar la
            app.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PlatformCard({
  platform,
  offer,
  highlighted,
  dimmed,
}: {
  platform: 'android' | 'ios';
  offer: PlatformOffer;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const name = platform === 'android' ? 'Android' : 'iPhone y iPad';
  return (
    <section
      aria-labelledby={`card-${platform}`}
      className={`relative rounded-[var(--radius-card)] p-6 transition-colors md:p-8 ${
        highlighted ? 'bg-accent text-ink' : 'bg-surface text-fg'
      } ${dimmed ? 'opacity-80' : ''}`}
    >
      <h3 id={`card-${platform}`} className="text-lead leading-none">
        {name}
      </h3>
      {highlighted ? <p className="mt-2 text-[15px] font-medium">Es tu dispositivo</p> : null}

      {offer.available && offer.href ? (
        <>
          <a
            href={offer.href}
            rel={offer.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className={`${highlighted ? 'btn-ink' : 'btn-primary'} mt-6 w-full text-[17px]`}
          >
            {offer.label}
          </a>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
            <dt className="opacity-70">Versión</dt>
            <dd>{offer.version}</dd>
            {offer.sizeLabel ? (
              <>
                <dt className="opacity-70">Tamaño</dt>
                <dd>{offer.sizeLabel}</dd>
              </>
            ) : null}
            {offer.minOs ? (
              <>
                <dt className="opacity-70">Requiere</dt>
                <dd>
                  {platform === 'android' ? 'Android' : 'iOS'} {offer.minOs} o superior
                </dd>
              </>
            ) : null}
            {offer.publishedAt ? (
              <>
                <dt className="opacity-70">Publicada</dt>
                <dd>
                  {new Date(offer.publishedAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </>
            ) : null}
          </dl>
          {offer.notes ? (
            <p className="mt-3 line-clamp-3 text-[15px] opacity-80">{offer.notes}</p>
          ) : null}
          <InstallSteps platform={platform} method={offer.method} />
          {offer.sha256 ? (
            <details className="mt-3 text-[13px] opacity-70">
              <summary className="cursor-pointer">Verificar el archivo (SHA-256)</summary>
              <code className="mt-2 block break-all">{offer.sha256}</code>
            </details>
          ) : null}
          {offer.beta ? (
            <a
              href={offer.beta.href}
              className="mt-3 inline-block text-[15px] underline underline-offset-4"
            >
              Probar la versión beta {offer.beta.version}
            </a>
          ) : null}
        </>
      ) : platform === 'ios' ? (
        <>
          <a
            href="/app"
            className={`${highlighted ? 'btn-ink' : 'btn-primary'} mt-6 w-full text-[17px]`}
          >
            Usar en iPhone
          </a>
          <p className="mt-3 text-[15px] opacity-80">
            Mientras preparamos la versión del App Store, usa la app web: es la misma app, con tu
            cuenta y tus playlists, y se instala en la pantalla de inicio.
          </p>
          <details className="mt-4 rounded-xl bg-black/15 p-4 text-[15px]" open>
            <summary className="cursor-pointer font-medium">¿Cómo se instala?</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 opacity-85">
              <li>
                Abre esta página en <strong>Safari</strong> y pulsa «Usar en iPhone».
              </li>
              <li>
                Pulsa el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).
              </li>
              <li>
                Elige <strong>Añadir a pantalla de inicio</strong> y después <strong>Añadir</strong>
                .
              </li>
              <li>Abre Aurevix desde el icono nuevo e inicia sesión.</li>
            </ol>
          </details>
        </>
      ) : (
        <>
          <button
            disabled
            className="mt-6 min-h-[52px] w-full cursor-not-allowed rounded-full bg-black/20 px-6 font-semibold opacity-60"
          >
            Descargar para Android
          </button>
          <p className="mt-3 text-[15px] opacity-80">
            Todavía no hay una versión de Android publicada. Cuando esté verificada aparecerá aquí
            con su número de versión y tamaño. Mientras tanto puedes{' '}
            <a href="/app" className="text-accent underline">
              usarla en el navegador
            </a>
            .
          </p>
        </>
      )}
    </section>
  );
}

function InstallSteps({
  platform,
  method,
}: {
  platform: 'android' | 'ios';
  method: PlatformOffer['method'];
}) {
  if (platform === 'android' && method === 'apk') {
    return (
      <details className="mt-4 rounded-xl bg-black/15 p-4 text-[15px]">
        <summary className="cursor-pointer font-medium">¿Cómo se instala?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 opacity-85">
          <li>Pulsa «Descargar para Android» y espera a que termine la descarga.</li>
          <li>Abre el archivo descargado desde la notificación o la carpeta Descargas.</li>
          <li>
            Si Android te pide permiso, pulsa <strong>Ajustes</strong> y activa{' '}
            <strong>Permitir de esta fuente</strong> para tu navegador. Vuelve atrás.
          </li>
          <li>
            Pulsa <strong>Instalar</strong> y después <strong>Abrir</strong>. Ya puedes registrarte
            o iniciar sesión.
          </li>
        </ol>
        <p className="mt-2 text-[13px] opacity-70">
          Android siempre muestra una confirmación al instalar apps fuera de Google Play; es normal.
        </p>
      </details>
    );
  }
  if (platform === 'ios' && method === 'testflight') {
    return (
      <details className="mt-4 rounded-xl bg-black/15 p-4 text-[15px]" open>
        <summary className="cursor-pointer font-medium">¿Cómo se instala?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 opacity-85">
          <li>
            Pulsa «Instalar en iPhone». Si no tienes la app TestFlight de Apple, el enlace te
            llevará a instalarla (gratis).
          </li>
          <li>
            Vuelve a esta página y pulsa de nuevo el botón: TestFlight mostrará «Aceptar» y luego
            «Instalar».
          </li>
          <li>Abre la app desde tu pantalla de inicio y regístrate o inicia sesión.</li>
        </ol>
        <p className="mt-2 text-[13px] opacity-70">
          TestFlight es el programa oficial de pruebas de Apple. Las versiones de prueba caducan a
          los 90 días; la app se actualiza desde TestFlight.
        </p>
      </details>
    );
  }
  return null;
}
