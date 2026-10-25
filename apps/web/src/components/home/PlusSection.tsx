import Image from 'next/image';
import Link from 'next/link';

/** Lo que tiene cada plan. Todo lo de «Gratis» sigue gratis; Premium añade, no quita. */
const ROWS: { label: string; free: boolean; plus: boolean }[] = [
  { label: 'Todo el catálogo, sin anuncios', free: true, plus: true },
  { label: 'Playlists, favoritos y artistas seguidos', free: true, plus: true },
  { label: 'Comentarios en el segundo exacto', free: true, plus: true },
  { label: 'Temporizador para dormir', free: true, plus: true },
  { label: 'Radios por género y radio de cada canción', free: true, plus: true },
  { label: 'Mix diarios y Descubrimiento semanal', free: true, plus: true },
  { label: 'Reposts y actividad de lo que sigues', free: true, plus: true },
  { label: 'Importar listas de Spotify, YouTube y SoundCloud', free: true, plus: true },
  { label: 'Publicar tu propia música como artista', free: false, plus: true },
  { label: 'Estadísticas de artista: escuchas y oyentes', free: false, plus: true },
  { label: 'Seguir sonando cuando se acaba la cola', free: false, plus: true },
  { label: 'Archivo original del artista, sin recomprimir', free: false, plus: true },
  { label: 'Descargas para escuchar sin conexión (Android)', free: false, plus: true },
  { label: 'Letras que avanzan con la canción', free: false, plus: true },
  { label: 'Tus estadísticas: minutos, top y horas', free: false, plus: true },
  { label: 'Velocidad de 0,75× a 2×', free: false, plus: true },
  { label: 'Insignia Premium en tu perfil', free: false, plus: true },
];

function Mark({ on }: { on: boolean }) {
  return on ? (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-label="Incluido" role="img">
      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  ) : (
    <span
      aria-label="No incluido"
      role="img"
      className="block h-0.5 w-3 rounded bg-current opacity-40"
    />
  );
}

/**
 * «Premium», en un campo lima a sangre: el nombre enorme y el precio a la izquierda, dos pantallas
 * reales de la app a la derecha, y debajo la tabla de lo que trae cada plan.
 */
export function PlusSection() {
  return (
    <section
      id="plus"
      aria-labelledby="plus-title"
      className="scroll-mt-0 overflow-clip bg-accent text-ink"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 px-[var(--gutter)] py-20 md:grid-cols-12 md:py-[14svh]">
        <div className="min-w-0 md:col-span-6" data-reveal>
          <p className="relative z-10 font-display text-[clamp(24px,3vw,36px)] font-bold leading-none">
            Aurevix
          </p>
          <h2
            id="plus-title"
            className="mt-4 font-display text-[clamp(64px,17vw,96px)] md:text-[clamp(96px,9.5vw,150px)] font-extrabold leading-[0.85] tracking-[-0.06em]"
          >
            Premium
          </h2>
          <p className="mt-8 font-display text-[clamp(32px,4vw,56px)] font-bold leading-none">
            4,99 € <span className="text-[0.55em] font-semibold">al mes</span>
          </p>
          <p className="mt-6 max-w-[40ch] text-lead font-medium leading-[1.2]">
            Publica tu música, escucha el archivo original y guárdalo para cuando no haya cobertura.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/app/plus" className="btn-ink">
              Hazte Premium en la app
            </Link>
            <p className="max-w-[34ch] text-small font-medium">
              Se paga por Bizum desde la app, con un código para el concepto. Sin permanencia y sin
              renovación automática.
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-start justify-center gap-4 md:col-span-6 md:gap-6">
          <figure className="relative aspect-[390/844] w-[min(42vw,260px)] -rotate-2 overflow-hidden rounded-[28px]">
            <Image
              src="/screens/app-stats.webp"
              alt="Pantalla de estadísticas de la app con minutos escuchados, canciones y artistas favoritos (datos de ejemplo)"
              fill
              sizes="280px"
              className="object-cover"
            />
          </figure>
          <figure className="relative mt-[12%] aspect-[390/844] w-[min(42vw,260px)] rotate-2 overflow-hidden rounded-[28px]">
            <Image
              src="/screens/app-plus.webp"
              alt="Pantalla de Aurevix Premium en la app con sus ventajas"
              fill
              sizes="280px"
              className="object-cover"
            />
          </figure>
        </div>

        <div className="min-w-0 md:col-span-12">
          <table className="w-full border-collapse text-left text-body">
            <caption className="sr-only">Qué incluye cada plan</caption>
            <thead>
              <tr className="border-b-2 border-ink">
                <th scope="col" className="py-3 font-semibold">
                  Qué incluye
                </th>
                <th scope="col" className="w-16 py-3 text-center font-semibold md:w-40">
                  Gratis
                </th>
                <th
                  scope="col"
                  className="w-24 py-3 text-center font-display text-body font-extrabold md:w-40 md:text-lead"
                >
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-ink/15">
                  <th scope="row" className="py-3 pr-4 font-medium">
                    {r.label}
                  </th>
                  <td className="py-3">
                    <span className="flex justify-center">
                      <Mark on={r.free} />
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="flex justify-center">
                      <Mark on={r.plus} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-small font-medium">
            Premium dura un mes desde que confirmamos el Bizum (o desde que acabe el mes que ya
            tengas). Condiciones completas en{' '}
            <Link href="/condiciones#plus" className="underline underline-offset-4">
              Condiciones de uso
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
