import Image from 'next/image';

/** Los tres pasos de un artista, cada uno con su pantalla real de la app. */
const STEPS = [
  {
    verb: 'Sube',
    text: 'Tu canción desde el estudio de artista de la app: audio, portada, letra y licencia.',
    image: '/screens/studio.webp',
    alt: 'Captura real del estudio de artista con canciones publicadas y una pendiente de revisión',
    ground: '#c8f560',
    ink: '#0c0c0e',
  },
  {
    verb: 'Revisamos',
    text: 'Derechos y calidad antes de publicar. Aquí solo suena música de quien la ha hecho.',
    image: '/screens/artist.webp',
    alt: 'Captura real del perfil de un artista con sus canciones populares',
    ground: '#b98cff',
    ink: '#0c0c0e',
  },
  {
    verb: 'Suena',
    text: 'En búsquedas, géneros y playlists. Y cada escucha de 30 s reales cuenta para ti.',
    image: '/screens/player.webp',
    alt: 'Captura real del reproductor a pantalla completa',
    ground: '#16161b',
    ink: '#f3f1ea',
  },
] as const;

/**
 * «Un verbo cada vez»: paneles a pantalla completa; el verbo se queda en el centro mientras su
 * pantalla pasa al lado, y el siguiente panel lo empuja. Solo CSS (position: sticky).
 */
export function ArtistVerbs() {
  return (
    <section id="artistas" aria-labelledby="artistas-title" className="relative scroll-mt-0">
      <h2 id="artistas-title" className="sr-only">
        Para artistas: sube, revisamos, suena
      </h2>
      {STEPS.map((s) => (
        <div
          key={s.verb}
          className="relative overflow-hidden"
          style={{ backgroundColor: s.ground, color: s.ink }}
        >
          <div className="mx-auto grid min-h-[100svh] max-w-[1400px] gap-10 px-[var(--gutter)] py-16 md:min-h-[125svh] md:grid-cols-[1.25fr_1fr] md:py-0">
            <div className="md:sticky md:top-[18svh] md:mt-[18svh] md:self-start" data-reveal>
              <h3 className="font-display text-[clamp(56px,11vw,184px)] font-extrabold leading-[0.85] tracking-[-0.04em]">
                {s.verb}
              </h3>
              <p className="mt-6 max-w-[34ch] text-lead font-medium leading-tight">{s.text}</p>
            </div>
            <div className="relative mx-auto aspect-[390/844] w-[min(72vw,340px)] overflow-hidden rounded-[32px] md:mb-[10svh] md:self-end">
              <Image src={s.image} alt={s.alt} fill sizes="340px" className="object-cover" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
