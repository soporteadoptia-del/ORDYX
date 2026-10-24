import { btnDanger, btnGhost, btnPrimary, Card, Flash, input, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';
import { deleteGenre, upsertGenre } from '../actions';

export default async function Genres({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await serverClient();
  const { data: genres } = await supabase.from('genres').select('id,slug,name,sort_order').order('sort_order');
  return (
    <>
      <PageTitle title="Géneros" />
      <Flash ok={sp.ok} error={sp.error} />
      <Card className="mb-6">
        <form action={upsertGenre} className="flex flex-wrap gap-2">
          <input name="name" placeholder="Nombre (p. ej. Reguetón)" required className={`${input} max-w-xs`} />
          <input name="slug" placeholder="slug (reggaeton)" required pattern="[a-z0-9-]{2,40}" className={`${input} max-w-xs`} />
          <input name="sort" type="number" placeholder="Orden" className={`${input} w-24`} />
          <button className={btnPrimary}>Añadir / actualizar</button>
        </form>
      </Card>
      <div className="space-y-2">
        {(genres ?? []).map((g) => (
          <Card key={g.id}>
            <div className="flex flex-wrap items-center gap-2">
              <form action={upsertGenre} className="flex flex-1 flex-wrap gap-2">
                <input type="hidden" name="slug" value={g.slug} />
                <input name="name" defaultValue={g.name} className={`${input} max-w-xs`} />
                <input name="sort" type="number" defaultValue={g.sort_order} className={`${input} w-24`} />
                <span className="self-center text-xs text-muted">{g.slug}</span>
                <button className={btnGhost}>Guardar</button>
              </form>
              <form action={deleteGenre}>
                <input type="hidden" name="id" value={g.id} />
                <button className={btnDanger}>Eliminar</button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
