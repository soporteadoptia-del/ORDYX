import { BRAND } from '@ordyx/shared';
import { Suspense } from 'react';
import { DownloadSection } from '@/components/DownloadSection';
import { ArtistVerbs } from '@/components/home/ArtistVerbs';
import { ClosingCta } from '@/components/home/ClosingCta';
import { FaqIndex } from '@/components/home/FaqIndex';
import { FeatureSheets } from '@/components/home/FeatureSheets';
import { PinnedHero } from '@/components/home/PinnedHero';
import { PlusSection } from '@/components/home/PlusSection';
import { ShowcaseZoom } from '@/components/home/ShowcaseZoom';

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
 * Portada de Aurevix Music. Dirección «The pinned poster» (taste-skill): el nombre se queda fijo
 * mientras pasan las canciones, cada una con su crédito, porque aquí toda la música la publica
 * quien la hace. Después, la app de cerca, los tres pasos del artista, lo que hace la app, la
 * descarga real, las preguntas y el cierre.
 */
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PinnedHero />
      <ShowcaseZoom />
      <ArtistVerbs />
      <FeatureSheets />
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
