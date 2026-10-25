import Image from 'next/image';

const STEPS = [
  {
    n: '1',
    verb: 'Sube',
    text: 'Tu canción desde el estudio de la app: audio, portada, letra y licencia.',
  },
  {
    n: '2',
    verb: 'Revisamos',
    text: 'Derechos y calidad antes de publicar. Solo suena música de quien la ha hecho.',
  },
  {
    n: '3',
    verb: 'Suena',
    text: 'En búsquedas, géneros y playlists. Cada escucha de 30 s reales cuenta para ti.',
  },
];

/** Para artistas: tres pasos en fila y el estudio real de la app al lado. */
export function ForArtists() {
  return (
    <section id="artistas" aria-labelledby="artistas-title" className="bg-accent text-ink">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-[var(--gutter)] py-20 md:grid-cols-12 md:items-center md:py-[14svh]">
        <div className="md:col-span-7">
          <h2 id="artistas-title" className="text-title">
            ¿Haces música? Publícala aquí.
          </h2>
          <ol className="mt-10 space-y-8">
            {STEPS.map((s) => (
              <li key={s.n} className="grid grid-cols-[auto_1fr] items-baseline gap-x-5">
                <span className="font-display text-[clamp(48px,6vw,84px)] font-extrabold leading-[0.85]">
                  {s.verb}
                </span>
                <p className="col-span-2 mt-2 max-w-[44ch] text-body font-medium md:col-span-1 md:mt-0">
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative mx-auto aspect-[390/844] w-full max-w-[min(70vw,320px)] overflow-hidden rounded-[32px] md:col-span-5">
          <Image
            src="/screens/app-studio.webp"
            alt="Estudio de artista de la app con canciones publicadas y una pendiente de revisión"
            fill
            sizes="320px"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
