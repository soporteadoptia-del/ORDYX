import Image from 'next/image';

/** «Última imagen, texto al lado»: el disco y la app a la izquierda, la invitación a la derecha. */
export function ClosingCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="grid bg-surface md:min-h-[90svh] md:grid-cols-2"
    >
      <div className="relative aspect-square md:aspect-auto">
        <Image
          src="/disco/still/finale.webp"
          alt="El móvil con la app de Aurevix delante del vinilo y su funda"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col justify-end gap-6 px-[var(--gutter)] py-14 md:px-16 md:pb-[14svh]">
        <h2 id="cta-title" className="text-title">
          Dale al play.
        </h2>
        <p className="max-w-[38ch] text-body text-muted">
          Gratis y con música de gente que la publica ella misma. En Android se instala desde aquí;
          en iPhone, desde Safari.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="#descargar" className="btn-primary">
            Descargar Aurevix Music
          </a>
          <a href="/app" className="btn-quiet">
            Abrir en el navegador
          </a>
        </div>
      </div>
    </section>
  );
}
