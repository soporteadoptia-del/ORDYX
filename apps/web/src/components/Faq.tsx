import Link from 'next/link';

export const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: '¿Es gratis?',
    a: 'Sí. Puedes escuchar todo el catálogo, crear playlists y seguir a artistas sin pagar ni ver anuncios. Aurevix Premium (4,99 € al mes, opcional) añade publicar tu propia música, estadísticas de artista, el archivo original del artista, descargas sin conexión, letras sincronizadas, tus estadísticas, «Seguir sonando» y velocidad de reproducción.',
  },
  {
    q: '¿De dónde sale la música de «Suena esta semana»?',
    a: 'De Audius, una red abierta donde artistas independientes publican su música. Te enseñamos lo más escuchado allí cada semana; el audio llega directamente desde Audius y la escucha cuenta para el artista. Los grandes éxitos de discográficas no están: para eso hacen falta licencias que hoy no tenemos.',
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
    a: 'Sí, con Aurevix Premium en la app de Android: abre el menú de una canción y toca «Descargar». Las canciones se guardan dentro de la app (no como archivos sueltos) y suenan sin conexión mientras tu plan esté activo.',
  },
  {
    q: '¿Cómo se paga Aurevix Premium?',
    a: 'Por Bizum, desde la app: en Premium te damos un código, envías 4,99 € al número que aparece con ese código en el concepto y pulsas «Ya he enviado el Bizum». Lo confirmamos a mano y te avisamos en Notificaciones. No hay renovación automática: cada mes decides si lo quieres.',
  },
  {
    q: '¿Puedo traer mis listas de Spotify, YouTube o SoundCloud?',
    a: 'Sí: en Biblioteca → Listas importadas pega los enlaces (o «Artista - Canción», una por línea). Buscamos cada canción en Aurevix y en Audius, y los vídeos de YouTube se ven con su reproductor oficial. No copiamos ni descargamos audio de otros servicios.',
  },
  {
    q: 'Soy artista, ¿cómo publico mi música?',
    a: (
      <>
        Publicar es parte de Aurevix Premium: hazte Premium en la app, crea tu perfil de artista
        desde «Tú → Estudio de artista» y sube tus canciones. Solo puedes subir música propia o con
        autorización de sus titulares; cada canción se revisa antes de publicarse. ¿Dudas?
        Escríbenos desde <Link href="/ayuda">Ayuda</Link>.
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
      {FAQ_ITEMS.map((item) => (
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
