import Link from 'next/link';

const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: '¿Es gratis?',
    a: 'Sí. Puedes escuchar, crear playlists y seguir a artistas sin pagar. Si en el futuro hay un plan de pago, será opcional y se anunciará con sus condiciones.',
  },
  {
    q: '¿Por qué en Android se descarga un archivo APK?',
    a: 'Mientras la app no esté en Google Play, la distribuimos directamente desde esta web. El APK está firmado por nosotros y publicamos su huella SHA-256 para que puedas verificarlo. Android te pedirá permiso para instalar apps de tu navegador: es un paso normal.',
  },
  {
    q: '¿Cómo la instalo en iPhone?',
    a: 'Apple no permite instalar apps descargando un archivo. Ahora mismo puedes usar la app web: abre la web en Safari, pulsa «Usar en iPhone» y después Compartir → «Añadir a pantalla de inicio». La versión nativa llegará por TestFlight (programa de pruebas de Apple) y después por el App Store.',
  },
  {
    q: '¿Mis playlists se guardan si cambio de móvil?',
    a: 'Sí. Tus favoritos, playlists, artistas seguidos e historial se guardan en tu cuenta y aparecen al iniciar sesión en otro dispositivo.',
  },
  {
    q: '¿Puedo escuchar sin conexión?',
    a: 'Todavía no. Las descargas para escuchar sin conexión requieren acuerdos de licencia y protección del contenido; están en nuestra hoja de ruta.',
  },
  {
    q: 'Soy artista, ¿cómo publico mi música?',
    a: (
      <>
        Crea tu cuenta y escríbenos desde <Link href="/ayuda">Ayuda</Link> para activar tu perfil de
        artista. Solo puedes subir música propia o con autorización de sus titulares; cada canción
        se revisa antes de publicarse.
      </>
    ),
  },
  {
    q: 'He encontrado música que me pertenece',
    a: (
      <>
        Usa el <Link href="/derechos">formulario de reclamación de derechos</Link>. Revisamos cada
        reclamación y retiramos el contenido cuando procede.
      </>
    ),
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line">
      {ITEMS.map((item) => (
        <details key={item.q} className="group p-5 [&_a]:text-accent-strong [&_a]:underline">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {item.q}
            <span aria-hidden className="text-muted transition group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-3 text-muted">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
