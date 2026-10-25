import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Condiciones de uso',
  alternates: { canonical: '/condiciones' },
};

export default function Terms() {
  return (
    <LegalPage title="Condiciones de uso" updated="25 de octubre de 2026">
      <h2>1. El servicio</h2>
      <p>
        Aurevix Music es una plataforma para escuchar música, crear playlists, seguir a artistas y,
        con Aurevix Premium en vigor, publicar música propia. [Pendiente: identificación del titular
        según la LSSI-CE.]
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
        reproducir en streaming (incluidas las escuchas sin conexión que la app guarda en su
        almacenamiento privado para suscriptores de Aurevix Premium) y mostrar el contenido dentro
        del servicio mientras siga publicado. Cada canción se revisa antes de publicarse y puede
        retirarse si recibimos una reclamación fundada.
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
      <h2 id="plus">7. Aurevix Premium</h2>
      <ul>
        <li>
          Aurevix Premium es un plan opcional de pago que cuesta 4,99 € por mes (IVA incluido).
          Añade funciones a la cuenta gratuita, que sigue igual.
        </li>
        <li>
          Publicar canciones como artista exige Premium en vigor. Si Premium caduca, las canciones
          ya publicadas siguen disponibles, pero no se pueden subir otras nuevas hasta renovarlo.
        </li>
        <li>
          Se paga por Bizum desde la app: te damos un código que debes poner en el concepto. Al
          confirmar el pago se activa un mes, contado desde la confirmación o desde el final del mes
          que ya tengas. No hay renovación automática ni cargos recurrentes.
        </li>
        <li>
          Si no podemos identificar un Bizum (sin código o con un importe distinto), te lo
          indicaremos en la app y te lo devolveremos si nos lo pides desde Ayuda.
        </li>
        <li>
          Al pedir la activación aceptas que el servicio empiece en cuanto confirmemos el pago. Por
          eso, una vez activado, no se aplica el derecho de desistimiento de 14 días sobre el mes ya
          iniciado. [Pendiente de revisión legal.]
        </li>
        <li>
          Las descargas sin conexión solo funcionan dentro de la app mientras el plan esté activo y
          no te dan ningún derecho sobre las obras. Si un artista retira una canción, deja de estar
          disponible también sin conexión la próxima vez que la app se conecte.
        </li>
      </ul>
      <h2>8. Ley aplicable</h2>
      <p>
        [Pendiente: legislación y fuero aplicables, respetando los derechos de consumidores y
        usuarios.]
      </p>
    </LegalPage>
  );
}
