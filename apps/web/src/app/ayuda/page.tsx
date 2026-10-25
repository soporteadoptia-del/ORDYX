import type { Metadata } from 'next';
import Link from 'next/link';
import { Faq } from '@/components/Faq';
import { getPublicConfig } from '@/lib/data';

export const metadata: Metadata = { title: 'Ayuda', alternates: { canonical: '/ayuda' } };

export default async function Help() {
  const { supportEmail } = await getPublicConfig();
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold">Ayuda</h1>
        <p className="mt-2 text-muted">
          ¿No encuentras lo que buscas? Escríbenos a{' '}
          <a className="text-accent-strong underline" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
      </header>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Instalar en Android</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Abre esta web en tu móvil y pulsa «Descargar para Android».</li>
          <li>
            Abre el archivo descargado. Si aparece «Por tu seguridad, tu teléfono no puede instalar
            apps desconocidas», pulsa Ajustes, activa «Permitir de esta fuente» y vuelve atrás.
          </li>
          <li>Pulsa Instalar. Al terminar, abre la app.</li>
          <li>
            Opcional: comprueba la huella SHA-256 del archivo con la que mostramos junto al botón.
          </li>
        </ol>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Instalar en iPhone o iPad</h2>
        <p className="text-muted">
          Apple solo permite instalar apps mediante sus canales oficiales. Mientras la app esté en
          pruebas usamos TestFlight; después estará en el App Store. Un archivo descargado no se
          puede instalar en un iPhone, así que nunca te pediremos que lo hagas.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Cuentas de artista</h2>
        <p className="text-muted">
          Para publicar música escríbenos desde el correo de tu cuenta con tu nombre artístico y
          enlaces a tu trabajo. Revisamos cada solicitud. Recuerda que solo puedes subir música
          propia o con permiso de sus titulares.
        </p>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold">Preguntas frecuentes</h2>
        <Faq />
      </section>
      <p className="text-sm text-muted">
        Para reclamar derechos de autor usa el{' '}
        <Link className="text-accent-strong underline" href="/derechos">
          formulario específico
        </Link>
        .
      </p>
    </div>
  );
}
