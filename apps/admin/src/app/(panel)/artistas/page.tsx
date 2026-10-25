import { btnGhost, Card, Empty, Flash, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';
import { setArtistFlags, setPlaylistFeatured } from '../actions';

export default async function Artists({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await serverClient();
  const [{ data: artists }, { data: albums }, { data: playlists }] = await Promise.all([
    supabase
      .from('artists')
      .select('id,name,slug,is_verified,is_featured,follower_count,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('albums')
      .select('id,title,status,release_date,artist:artists(name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('playlists')
      .select('id,title,is_featured,save_count,owner:profiles(username)')
      .eq('is_public', true)
      .order('save_count', { ascending: false })
      .limit(50),
  ]);
  return (
    <>
      <PageTitle
        title="Artistas, álbumes y playlists"
        subtitle="Verifica artistas (solo tras comprobar su identidad) y elige qué destacar en la portada de la app."
      />
      <Flash ok={sp.ok} error={sp.error} />
      <h2 className="mb-3 text-lg font-bold">Artistas</h2>
      {(artists ?? []).length === 0 ? <Empty>Aún no hay artistas.</Empty> : null}
      <div className="space-y-2">
        {(artists ?? []).map((a) => (
          <Card key={a.id}>
            <form action={setArtistFlags} className="flex flex-wrap items-center gap-4">
              <input type="hidden" name="id" value={a.id} />
              <div className="flex-1">
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-muted">
                  /{a.slug} · {a.follower_count} seguidores
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="verified" defaultChecked={a.is_verified} /> Verificado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="featured" defaultChecked={a.is_featured} /> Destacado
              </label>
              <button className={btnGhost}>Guardar</button>
            </form>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Álbumes recientes</h2>
      <Card>
        {(albums ?? []).length === 0 ? <Empty>Aún no hay álbumes.</Empty> : null}
        <ul className="space-y-1 text-sm">
          {(albums ?? []).map((al) => (
            <li key={al.id}>
              {al.title}{' '}
              <span className="text-muted">
                · {(al.artist as unknown as { name: string } | null)?.name} · {al.status}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <h2 className="mb-3 mt-8 text-lg font-bold">Playlists públicas</h2>
      <div className="space-y-2">
        {(playlists ?? []).map((p) => (
          <Card key={p.id}>
            <form action={setPlaylistFeatured} className="flex items-center gap-4">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="featured" value={String(!p.is_featured)} />
              <p className="flex-1 text-sm">
                {p.title}{' '}
                <span className="text-muted">
                  · @{(p.owner as unknown as { username: string } | null)?.username} · guardada{' '}
                  {p.save_count} veces
                </span>
              </p>
              <button className={btnGhost}>
                {p.is_featured ? 'Quitar de destacadas' : 'Destacar'}
              </button>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
