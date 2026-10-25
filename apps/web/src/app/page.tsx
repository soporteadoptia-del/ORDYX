import { BRAND } from '@ordyx/shared';
import { Suspense } from 'react';
import { DownloadSection } from '@/components/DownloadSection';
import { AppGallery } from '@/components/home/AppGallery';
import { ClosingCta } from '@/components/home/ClosingCta';
import { FaqIndex } from '@/components/home/FaqIndex';
import { ForArtists } from '@/components/home/ForArtists';
import { NowOnAudius } from '@/components/home/NowOnAudius';
import { PlusSection } from '@/components/home/PlusSection';
import { Hero } from '@/components/home/Hero';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: BRAND.name,
  operatingSystem: 'Android, iOS',
  applicationCategory: 'MusicApplication',
  description: BRAND.description,
  offers: [
    { '@type': 'Offer', name: 'Gratis', price: '0', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Aurevix Plus (1 mes)', price: '4.99', priceCurrency: 'EUR' },
  ],
};

/**
 * Portada de Aurevix Music: titular con la app real, lo que suena esta semana (Audius, se escucha
 * aquí mismo), la app por dentro, la invitación a artistas, Plus, la descarga, preguntas y cierre.
 */
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <NowOnAudius />
      <AppGallery />
      <ForArtists />
      <PlusSection />

      <section
        id="descargar"
        aria-labelledby="descargar-titulo"
        className="mx-auto max-w-[1400px] scroll-mt-8 px-[var(--gutter)] py-20 md:py-[14svh]"
      >
        <div className="mb-10 grid gap-6 md:grid-cols-2 md:items-end" data-reveal>
          <h2 id="descargar-titulo" className="text-title">
            Instálala hoy
          </h2>
          <p className="max-w-[44ch] text-body text-muted">
            En Android se descarga desde aquí; en iPhone se añade a la pantalla de inicio desde
            Safari. Solo enlazamos versiones publicadas y verificadas.
          </p>
        </div>
        <Suspense
          fallback={
            <div
              className="h-72 animate-pulse rounded-2xl bg-surface"
              aria-label="Cargando versiones"
            />
          }
        >
          <DownloadSection />
        </Suspense>
      </section>

      <FaqIndex />
      <ClosingCta />
    </>
  );
}
