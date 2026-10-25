import { BRAND } from '@ordyx/shared';
import Image from 'next/image';
import { Suspense } from 'react';
import { DownloadSection } from '@/components/DownloadSection';
import { Faq } from '@/components/Faq';

const FEATURES = [
  {
    title: 'Reproductor de verdad',
    text: 'Segundo plano, controles en la pantalla de bloqueo, cola, aleatorio y repetición. Retoma donde lo dejaste.',
  },
  {
    title: 'Playlists a tu manera',
    text: 'Crea, ordena y comparte playlists públicas o privadas. Guarda las de otras personas.',
  },
  {
    title: 'Artistas independientes',
    text: 'Descubre música publicada directamente por sus autores, revisada antes de llegar al catálogo.',
  },
  {
    title: 'Comentarios en el momento justo',
    text: 'Comenta una canción y ánclalo al segundo exacto que te ha gustado.',
  },
  {
    title: 'Tu biblioteca en todos tus dispositivos',
    text: 'Favoritos, historial y playlists sincronizados con tu cuenta.',
  },
  {
    title: 'Publica tu música',
    text: 'Si eres artista, sube tus canciones con su portada y licencia, y sigue sus reproducciones válidas.',
  },
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
      <section className="aurora relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
          <div className="space-y-6">
            <p className="eyebrow">Gratis · Android e iPhone</p>
            <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-7xl">
              Tu música. <span className="text-gradient">Artistas que aún no conoces.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted">{BRAND.description}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#descargar"
                className="btn-primary inline-flex min-h-[50px] items-center rounded-full px-6 font-semibold text-ink"
              >
                Descargar la app
              </a>
              <a
                href="#funciones"
                className="inline-flex min-h-[50px] items-center rounded-full border border-line bg-white/[0.03] px-6 font-semibold hover:border-line2"
              >
                Ver funciones
              </a>
            </div>
          </div>
          <div className="relative mx-auto flex gap-4">
            <Image
              src="/screenshots/mobile-signin.png"
              alt="Captura real de la app: pantalla de inicio de sesión"
              width={390}
              height={844}
              priority
              className="w-56 rounded-[2rem] border border-line shadow-2xl sm:w-64"
            />
            <Image
              src="/screenshots/mobile-signup.png"
              alt="Captura real de la app: registro de cuenta"
              width={390}
              height={844}
              className="mt-16 hidden w-56 rounded-[2rem] border border-line shadow-2xl sm:block sm:w-64"
            />
          </div>
        </div>
      </section>

      <section
        id="descargar"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6"
        aria-labelledby="descargar-titulo"
      >
        <h2 id="descargar-titulo" className="mb-2 text-3xl font-extrabold tracking-tight">
          Descarga {BRAND.name}
        </h2>
        <p className="mb-8 text-muted">
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

      <section id="funciones" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-3xl font-extrabold tracking-tight">
          Todo lo que necesitas para escuchar y descubrir
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="glass rounded-[var(--radius-card)] p-6">
              <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
              <p className="text-sm text-muted">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="req">
        <h2 id="req" className="mb-6 text-2xl font-bold">
          Requisitos mínimos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line p-5">
            <h3 className="font-semibold">Android</h3>
            <p className="text-sm text-muted">
              Android 7.0 (API 24) o superior · unos 150 MB libres · conexión a internet para
              reproducir.
            </p>
          </div>
          <div className="rounded-2xl border border-line p-5">
            <h3 className="font-semibold">iPhone y iPad</h3>
            <p className="text-sm text-muted">
              iOS / iPadOS 15.1 o superior · conexión a internet para reproducir.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-subtle">
          Los requisitos exactos de cada versión se muestran junto a su botón de descarga.
        </p>
      </section>

      <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="mb-8 text-3xl font-extrabold tracking-tight">Preguntas frecuentes</h2>
        <Faq />
      </section>
    </>
  );
}
