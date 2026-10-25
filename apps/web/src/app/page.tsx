import { BRAND } from '@ordyx/shared';
import Image from 'next/image';
import { Suspense } from 'react';
import { DownloadSection } from '@/components/DownloadSection';
import { Faq } from '@/components/Faq';

type IconName = 'play' | 'list' | 'spark' | 'chat' | 'sync' | 'upload';

/** Iconos de trazo (24×24) en el estilo de aurevixweb.es. */
const ICONS: Record<IconName, string> = {
  play: 'M8 5v14l11-7z',
  list: 'M4 6h16M4 12h10M4 18h7M17 15v6l4-3z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  sync: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
};

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'play',
    title: 'Reproductor de verdad',
    text: 'Segundo plano, controles en la pantalla de bloqueo, cola, aleatorio y repetición. Retoma donde lo dejaste.',
  },
  {
    icon: 'list',
    title: 'Playlists a tu manera',
    text: 'Crea, ordena y comparte playlists públicas o privadas. Guarda las de otras personas.',
  },
  {
    icon: 'spark',
    title: 'Artistas independientes',
    text: 'Descubre música publicada directamente por sus autores, revisada antes de llegar al catálogo.',
  },
  {
    icon: 'chat',
    title: 'Comentarios en el segundo justo',
    text: 'Comenta una canción y ánclalo al segundo exacto que te ha gustado.',
  },
  {
    icon: 'sync',
    title: 'En todos tus dispositivos',
    text: 'Favoritos, historial y playlists sincronizados con tu cuenta.',
  },
  {
    icon: 'upload',
    title: 'Publica tu música',
    text: 'Si eres artista, sube tus canciones con su portada y licencia, y sigue sus reproducciones válidas.',
  },
];

const GENRES = [
  'Electrónica',
  'Pop',
  'Hip hop',
  'Rock',
  'Indie',
  'Lo-fi',
  'Ambient',
  'Jazz',
  'Clásica',
  'Urbano',
  'Flamenco',
  'Experimental',
];

const ARTIST_STEPS = [
  { title: 'Sube tu canción', text: 'Audio, portada, letra y licencia desde la app.' },
  { title: 'Revisión', text: 'Comprobamos derechos y calidad antes de publicar.' },
  { title: 'Publicada', text: 'Aparece en búsquedas, géneros y playlists.' },
  { title: 'Estadísticas', text: 'Reproducciones válidas (30 s reales) y seguidores.' },
];

/** Alturas fijas para la onda decorativa (deterministas: sin hidratación distinta). */
const WAVE = [
  18, 34, 52, 30, 64, 82, 48, 26, 58, 90, 70, 40, 22, 46, 76, 60, 32, 54, 86, 44, 28, 62, 38, 20,
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: BRAND.name,
  operatingSystem: 'Android, iOS',
  applicationCategory: 'MusicApplication',
  description: BRAND.description,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------------------------------------------------------------- portada */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:pt-24">
          <div className="relative z-10 space-y-7">
            <p className="eyebrow">Gratis · Android e iPhone</p>
            <h1 className="text-[46px] font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-[76px]">
              Tu música.
              <br />
              <span className="text-gradient">Artistas que aún no conoces.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted">{BRAND.description}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#descargar"
                className="btn-primary inline-flex min-h-[54px] items-center gap-2 rounded-full px-7 text-[15.5px] font-semibold text-ink"
              >
                <Icon name="upload" className="h-[18px] w-[18px] rotate-180" />
                Descargar la app
              </a>
              <a
                href="/app"
                className="inline-flex min-h-[54px] items-center gap-2 rounded-full border border-line2 bg-white/[0.04] px-7 font-semibold backdrop-blur hover:border-accent/50"
              >
                <Icon name="play" className="h-4 w-4 text-accent" />
                Abrir en el navegador
              </a>
            </div>
            <dl className="grid max-w-md grid-cols-3 gap-3 pt-2">
              {[
                ['30 s', 'escucha real por reproducción'],
                ['12', 'géneros para empezar'],
                ['0 €', 'para escuchar'],
              ].map(([n, l]) => (
                <div
                  key={l}
                  className="rounded-2xl border border-line bg-surface/60 p-3 backdrop-blur"
                >
                  <dt className="font-display text-2xl font-extrabold text-accent">{n}</dt>
                  <dd className="text-xs leading-snug text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto h-[600px] w-full max-w-[440px]">
            <div
              className="vinyl absolute -right-24 top-10 h-[400px] w-[400px] opacity-90 sm:-right-32 sm:h-[460px] sm:w-[460px]"
              aria-hidden
            />
            <div className="device absolute right-0 top-16 hidden w-[220px] rotate-[7deg] opacity-80 sm:block">
              <Image
                src="/screenshots/mobile-signup.png"
                alt="Captura real de la app: registro de cuenta"
                width={390}
                height={844}
              />
            </div>
            <div className="device float absolute left-2 top-0 z-10 w-[245px] -rotate-[3deg] sm:left-6">
              <Image
                src="/screenshots/mobile-home.png"
                alt="Captura real de la app: pantalla de inicio"
                width={390}
                height={844}
                priority
              />
            </div>
            <div
              className="glass float absolute -left-2 bottom-6 z-20 flex items-center gap-3 rounded-2xl p-3 pr-5 sm:-left-12"
              style={{ animationDelay: '-1.5s' }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-ink">
                <Icon name="play" className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  Sonando ahora
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  Tu próxima canción favorita
                  <span className="eq" aria-hidden>
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>
        <div
          className="wave pointer-events-none absolute inset-x-0 bottom-0 h-24 px-4 opacity-60"
          aria-hidden
        >
          {[...WAVE, ...WAVE, ...WAVE].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- géneros */}
      <div className="marquee overflow-hidden border-y border-line bg-bg2/70 py-4" aria-hidden>
        <div className="marquee-track">
          {[...GENRES, ...GENRES].map((g, i) => (
            <span
              key={i}
              className="flex items-center gap-3 whitespace-nowrap font-display text-2xl font-bold text-fg/80"
            >
              {g}
              <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-accent" />
            </span>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- descarga */}
      <section
        id="descargar"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6"
        aria-labelledby="descargar-titulo"
      >
        <p className="eyebrow mb-3">Descarga</p>
        <h2 id="descargar-titulo" className="mb-3 text-4xl font-bold sm:text-5xl">
          Llévate {BRAND.name} en el bolsillo
        </h2>
        <p className="mb-10 max-w-2xl text-lg text-muted">
          Elige tu dispositivo. Solo mostramos versiones publicadas y verificadas.
        </p>
        <Suspense
          fallback={
            <div
              className="h-64 animate-pulse rounded-2xl bg-surface"
              aria-label="Cargando versiones"
            />
          }
        >
          <DownloadSection />
        </Suspense>
      </section>

      {/* ---------------------------------------------------------------- funciones */}
      <section id="funciones" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <p className="eyebrow mb-3">Funciones</p>
        <h2 className="mb-12 max-w-3xl text-4xl font-bold sm:text-5xl">
          Todo lo que necesitas para escuchar y{' '}
          <span className="text-gradient">descubrir música</span>
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="card group p-7">
              <div className="mb-6 flex items-center justify-between">
                <span className="grid h-12 w-12 -rotate-6 place-items-center rounded-[14px] bg-accent text-ink transition group-hover:rotate-0">
                  <Icon name={f.icon} className="h-6 w-6" />
                </span>
                <span className="font-mono text-xs text-subtle">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mb-2 text-xl font-bold">{f.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- artistas */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="card relative overflow-hidden p-8 sm:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-warm/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="eyebrow mb-3">Para artistas</p>
              <h2 className="mb-4 text-4xl font-bold sm:text-5xl">
                Publica tu música <span className="text-gradient">sin intermediarios</span>
              </h2>
              <p className="text-lg text-muted">
                Sube tus canciones desde el móvil y llega a gente que busca justo lo que haces. Tú
                conservas los derechos.
              </p>
            </div>
            <ol className="relative space-y-6 border-l border-line2 pl-8">
              {ARTIST_STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="absolute -left-[42px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent font-mono text-[10px] font-bold text-ink">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- requisitos */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="req">
        <h2 id="req" className="mb-6 text-2xl font-bold">
          Requisitos mínimos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-semibold">Android</h3>
            <p className="text-sm text-muted">
              Android 7.0 (API 24) o superior · unos 150 MB libres · conexión a internet para
              reproducir.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">iPhone y iPad</h3>
            <p className="text-sm text-muted">
              Safari en iOS 16.4 o superior para la app web; iOS 15.1 o superior para la app nativa
              cuando se publique.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- preguntas */}
      <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <p className="eyebrow mb-3">Ayuda</p>
        <h2 className="mb-8 text-4xl font-bold">Preguntas frecuentes</h2>
        <Faq />
      </section>

      {/* ---------------------------------------------------------------- llamada final */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] bg-accent px-8 py-14 text-ink sm:px-14">
          <div
            className="wave pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-30 mix-blend-multiply"
            aria-hidden
          >
            {WAVE.map((h, i) => (
              <span key={i} style={{ height: `${h}%`, background: '#0c0c0e' }} />
            ))}
          </div>
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <h2 className="max-w-xl text-4xl font-extrabold leading-[1] tracking-[-0.03em] sm:text-6xl">
              Dale al play.
            </h2>
            <a
              href="#descargar"
              className="inline-flex min-h-[54px] items-center rounded-full bg-ink px-8 font-semibold text-fg transition hover:bg-black"
            >
              Descargar {BRAND.name}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
