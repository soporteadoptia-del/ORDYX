import { formatLongDuration } from '@ordyx/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSharedPlaylist } from '@/lib/data';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getSharedPlaylist((await params).id);
  if (!p) return { title: 'Playlist no disponible' };
  return { title: `${p.title} · playlist de @${p.owner}`, description: p.description ?? undefined, openGraph: { images: p.coverUrl ? [p.coverUrl] : ['/brand/icon-512.png'] } };
}

async function Content({ params }: Props) {
  const p = await getSharedPlaylist((await params).id);
  if (!p) notFound();
  return (
    <div className="aurora">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
        {p.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt="" width={256} height={256} className="h-64 w-64 rounded-2xl object-cover shadow-2xl" />
        ) : (
          <div className="btn-primary h-64 w-64 rounded-2xl" aria-hidden />
        )}
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted">PLAYLIST</p>
          <h1 className="text-4xl font-black">{p.title}</h1>
          <p className="mt-1 text-muted">
            de @{p.owner} · {p.trackCount} canciones · {formatLongDuration(p.durationMs)}
          </p>
        </div>
        {p.description ? <p className="max-w-xl text-muted">{p.description}</p> : null}
        <Link href="/#descargar" className="btn-primary rounded-full px-8 py-4 font-bold text-white">
          Escúchala en la app
        </Link>
      </div>
    </div>
  );
}

export default function SharedPlaylistPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-surface" aria-label="Cargando" />}>
      <Content params={params} />
    </Suspense>
  );
}
