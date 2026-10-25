import Image from 'next/image';

/** Capacidades reales de la app, cada una con la pantalla que la muestra. */
const SHEETS = [
  {
    title: 'Tus playlists, a tu manera',
    text: 'Crea, ordena y comparte playlists públicas o privadas, guarda las de otras personas y encuentra tus favoritos en cualquier móvil con tu cuenta.',
    image: '/screens/library.webp',
    alt: 'Captura real de la biblioteca con favoritos, historial y una playlist',
    ground: '#1d1d24',
    ink: '#f3f1ea',
  },
  {
    title: 'Doce géneros para empezar',
    text: 'Del flamenco al lo-fi: busca canciones, artistas, álbumes y playlists, o entra por género y deja que suene.',
    image: '/screens/search.webp',
    alt: 'Captura real de la búsqueda con los géneros en tarjetas de colores',
    ground: '#f3f1ea',
    ink: '#0c0c0e',
  },
  {
    title: 'Comenta en el segundo justo',
    text: 'Deja un comentario anclado al segundo exacto de la canción que te ha gustado, sigue a artistas y recibe sus novedades.',
    image: '/screens/player.webp',
    alt: 'Captura real del reproductor con el botón de comentarios',
    ground: '#c8f560',
    ink: '#0c0c0e',
  },
] as const;

/** «Hojas de color que se apilan»: cada hoja sube sobre la anterior y deja ver su título. */
export function FeatureSheets() {
  return (
    <section
      aria-labelledby="features-title"
      className="px-[var(--gutter)] pb-6 pt-20 md:pb-[12svh] md:pt-[16svh]"
    >
      <h2 id="features-title" className="mx-auto mb-12 max-w-[1400px] text-title" data-reveal>
        Todo lo que esperas
      </h2>
      <div className="mx-auto max-w-[1400px]">
        {SHEETS.map((s, i) => (
          <article
            key={s.title}
            className="mb-4 grid overflow-hidden rounded-[16px] md:sticky md:mb-0 md:min-h-[78svh] md:grid-cols-12 md:rounded-b-none"
            style={{ top: `${72 + i * 64}px`, backgroundColor: s.ground, color: s.ink }}
          >
            <div className="flex flex-col justify-between gap-8 p-6 md:col-span-6 md:px-10 md:pb-10 md:pt-4">
              <h3 className="text-lead leading-none">{s.title}</h3>
              <p className="max-w-[40ch] text-body">{s.text}</p>
            </div>
            <div className="relative order-first aspect-[4/3] md:order-none md:col-span-6 md:aspect-auto">
              <Image
                src={s.image}
                alt={s.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover object-top"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
