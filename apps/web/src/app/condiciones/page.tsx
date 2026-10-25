import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Condiciones de uso',
  alternates: { canonical: '/condiciones' },
};

export default function Terms() {
  return (
    <LegalPage title="Condiciones de uso" updated="24 de octubre de 2026">
      <h2>1. El servicio</h2>
      <p>
        Ordyx es una plataforma para escuchar música, crear playlists, seguir a artistas y, para
        cuentas autorizadas, publicar música propia. [Pendiente: identificación del titular según la
        LSSI-CE.]
      </p>
      <h2>2. Cuenta</h2>
      <p>
        Debes facilitar datos veraces y custodiar tu contraseña. Podemos suspender cuentas que
        incumplan estas condiciones, previa comunicación y con posibilidad de reclamar.
      </p>
      <h2>3. Uso aceptable</h2>
      <ul>
        <li>
          No publiques contenido ilícito, de terceros sin autorización, de odio, acoso o spam.
        </li>
        <li>
          No intentes manipular reproducciones o estadísticas ni eludir las medidas técnicas del
          servicio.
        </li>
        <li>No extraigas contenido de forma automatizada.</li>
      </ul>
      <h2>4. Contenido que publicas</h2>
      <p>
        Conservas todos tus derechos. Al publicar declaras que eres titular de la grabación y de la
        obra, o que tienes autorización, y nos concedes una licencia no exclusiva para alojar,
        reproducir en streaming y mostrar el contenido dentro del servicio mientras siga publicado.
        Cada canción se revisa antes de publicarse y puede retirarse si recibimos una reclamación
        fundada.
      </p>
      <h2>5. Derechos de autor y contenido ilícito</h2>
      <p>
        Los titulares pueden usar el <Link href="/derechos">formulario de reclamación</Link>.
        Cualquier persona puede denunciar contenido desde la app. Informamos al autor de las
        decisiones de moderación y de cómo recurrirlas.
      </p>
      <h2>6. Disponibilidad</h2>
      <p>
        El servicio se presta «tal cual». Podemos actualizar la app o retirar versiones defectuosas;
        algunas actualizaciones requerirán instalar una nueva versión.
      </p>
      <h2>7. Ley aplicable</h2>
      <p>
        [Pendiente: legislación y fuero aplicables, respetando los derechos de consumidores y
        usuarios.]
      </p>
    </LegalPage>
  );
}
