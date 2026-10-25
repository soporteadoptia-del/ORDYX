import { formatDuration } from '@ordyx/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSharedTrack } from '@/lib/data';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = await getSharedTrack((await params).id);
  if (!track) return { title: 'Canción no disponible' };
  return {
    title: `${track.title} · ${track.artistName}`,
    description:
      track.description ?? `Escucha «${track.title}» de ${track.artistName} en Aurevix Music.`,
    openGraph: {
      images: track.coverUrl ? [track.coverUrl] : ['/brand/icon-512.png'],
      type: 'music.song',
    },
  };
}

/** Página pública para enlaces compartidos. Solo muestra canciones publicadas (RLS); el audio requiere la app. */
async function Content({ params }: Props) {
  const track = await getSharedTrack((await params).id);
  if (!track) notFound();
  return (
    <div>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.coverUrl}
            alt=""
            width={256}
            height={256}
            className="h-64 w-64 rounded-2xl object-cover shadow-2xl"
          />
        ) : (
          <div className="grid h-64 w-64 place-items-center rounded-2xl bg-surface" aria-hidden />
        )}
        <div>
          <h1 className="text-4xl font-extrabold">{track.title}</h1>
          <p className="mt-1 text-lg text-muted">
            {track.artistName} · {formatDuration(track.durationMs)}
          </p>
          {track.isDemo ? (
            <p className="mt-2 text-xs text-warning">Contenido de demostración</p>
          ) : null}
        </div>
        {track.description ? <p className="max-w-xl text-muted">{track.description}</p> : null}
        <Link href="/#descargar" className="btn-primary rounded-full px-8 py-4 font-bold text-ink">
          Escúchala en la app
        </Link>
      </div>
    </div>
  );
}

export default function SharedTrackPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-surface"
          aria-label="Cargando"
        />
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
