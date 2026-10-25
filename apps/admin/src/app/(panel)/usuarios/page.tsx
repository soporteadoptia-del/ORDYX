import { Badge, btnDanger, btnGhost, Card, Empty, Flash, input, PageTitle } from '@/components/ui';
import { requireStaff } from '@/lib/auth';
import { serverClient } from '@/lib/supabase-server';
import { setUserRole, setUserStatus } from '../actions';

type Row = {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
  status: 'active' | 'suspended';
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  artist: 'Artista',
  moderator: 'Moderación',
  admin: 'Administración',
};

export default async function Users({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; p?: string; ok?: string; error?: string }>;
}) {
  const session = await requireStaff();
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.p ?? 0) || 0);
  const supabase = await serverClient();
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_query: sp.q ?? null,
    p_limit: 50,
    p_offset: page * 50,
  });
  const users = (data ?? []) as Row[];

  return (
    <>
      <PageTitle
        title="Usuarios"
        subtitle="Suspender impide crear contenido, comentar y reproducir. Los roles solo los cambia administración."
      />
      <Flash ok={sp.ok} error={sp.error ?? error?.message} />
      <form className="mb-5 flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Buscar por usuario, nombre o correo"
          className={input}
        />
        <button className={btnGhost}>Buscar</button>
      </form>
      {users.length === 0 ? <Empty>No hay resultados.</Empty> : null}
      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  @{u.username}{' '}
                  {u.display_name ? <span className="text-muted">· {u.display_name}</span> : null}
                </p>
                <p className="text-sm text-muted">
                  {u.email} {u.email_confirmed ? '' : '(sin confirmar)'} · alta{' '}
                  {new Date(u.created_at).toLocaleDateString('es-ES')} · último acceso{' '}
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleDateString('es-ES')
                    : '—'}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge value={u.status} label={u.status === 'active' ? 'activa' : 'suspendida'} />
                  {u.roles.map((r) => (
                    <Badge key={r} value="processing" label={ROLE_LABEL[r] ?? r} />
                  ))}
                </div>
              </div>
              {session.isAdmin && u.id !== session.userId ? (
                <div className="flex flex-wrap gap-2">
                  {(['artist', 'moderator', 'admin'] as const).map((role) => (
                    <form key={role} action={setUserRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={role} />
                      <input type="hidden" name="grant" value={String(!u.roles.includes(role))} />
                      <button className={btnGhost}>
                        {u.roles.includes(role)
                          ? `Quitar ${ROLE_LABEL[role]}`
                          : `Dar ${ROLE_LABEL[role]}`}
                      </button>
                    </form>
                  ))}
                  <form action={setUserStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    {u.status === 'active' ? (
                      <>
                        <input
                          name="reason"
                          placeholder="Motivo"
                          className={`${input} w-36`}
                          required
                        />
                        <input type="hidden" name="status" value="suspended" />
                        <button className={btnDanger}>Suspender</button>
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="status" value="active" />
                        <button className={btnGhost}>Reactivar</button>
                      </>
                    )}
                  </form>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        {page > 0 ? (
          <a
            className={btnGhost}
            href={`/usuarios?p=${page - 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}`}
          >
            Anterior
          </a>
        ) : null}
        {users.length === 50 ? (
          <a
            className={btnGhost}
            href={`/usuarios?p=${page + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}`}
          >
            Siguiente
          </a>
        ) : null}
      </div>
    </>
  );
}
