import Image from 'next/image';

/**
 * Portada: el titular grande a un lado y la app de verdad en el otro (patrón «Hero with Mockup» de
 * 21st.dev). Dos capturas reales en móvil sobre un campo lima; entra una sola vez, sin bucles.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid max-w-[1400px] items-center gap-12 overflow-clip px-[var(--gutter)] pb-20 pt-8 md:grid-cols-12 md:pb-[12svh] md:pt-[6svh]"
    >
      <div className="hero-in md:col-span-6">
        <h1
          id="hero-title"
          className="font-display text-[clamp(42px,6.2vw,96px)] font-extrabold leading-[0.92] tracking-[-0.04em]"
        >
          Música de quien la hace.
        </h1>
        <p className="mt-6 max-w-[38ch] text-lead font-medium leading-tight text-muted">
          Aurevix Music: escúchala gratis y sin anuncios, descubre lo que suena esta semana o
          publica la tuya.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#descargar" className="btn-primary">
            Descargar la app
          </a>
          <a href="/app" className="btn-quiet">
            Abrir en el navegador
          </a>
        </div>
        <p className="mt-6 text-small text-subtle">
          Android e iPhone · Gratis · Plus por 4,99 € al mes
        </p>
      </div>

      <div className="hero-in hero-in-late relative md:col-span-6">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[560px] overflow-hidden rounded-[32px] bg-accent">
          <div className="absolute left-[8%] top-[9%] aspect-[390/844] w-[46%] -rotate-[4deg] overflow-hidden rounded-[28px] bg-ink border-[6px] border-ink">
            <Image
              src="/screens/app-home.webp"
              alt="Inicio de la app: accesos rápidos y lo que suena esta semana"
              fill
              priority
              sizes="(min-width: 768px) 260px, 45vw"
              className="object-cover"
            />
          </div>
          <div className="absolute right-[7%] top-[20%] aspect-[390/844] w-[46%] rotate-[5deg] overflow-hidden rounded-[28px] bg-ink border-[6px] border-ink">
            <Image
              src="/screens/app-player.webp"
              alt="Reproductor de la app con letra, velocidad y temporizador"
              fill
              priority
              sizes="(min-width: 768px) 260px, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
