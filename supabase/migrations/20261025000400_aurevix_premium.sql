-- Aurevix Premium (antes «Plus»; las tablas y funciones conservan el nombre `plus` por compatibilidad).
--
-- 1. Publicar música exige Premium en vigor. La administración puede subir siempre. El rol `artist`
--    deja de ser necesario: quien paga Premium puede crear su perfil de artista y subir canciones,
--    que siguen pasando la revisión de moderación. Si Premium caduca, sus canciones siguen
--    publicadas, pero no puede subir otras nuevas hasta renovar.
-- 2. `is_premium(uuid)`: solo un booleano, para mostrar la insignia Premium en perfiles públicos.
-- 3. `my_artist_stats(days)`: escuchas de las canciones de mis artistas (Premium).

create or replace function private.can_upload()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and (private.has_role('admin') or private.is_plus((select auth.uid())));
$$;

create or replace function public.is_premium(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_plus(p_user);
$$;
revoke execute on function public.is_premium(uuid) from public;
grant execute on function public.is_premium(uuid) to anon, authenticated;

-- ¿Puede el usuario actual subir música? (la app lo usa para decidir qué mostrar)
create or replace function public.my_can_upload()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.can_upload(), false);
$$;
revoke execute on function public.my_can_upload() from public, anon;
grant execute on function public.my_can_upload() to authenticated;

create or replace function public.my_artist_stats(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3660)));
begin
  if v_user is null then raise exception 'ordyx:not_allowed'; end if;
  if not (private.is_plus(v_user) or private.has_role('admin')) then
    raise exception 'ordyx:plus_required';
  end if;
  return (
    with mine as (
      select t.id, t.title, t.cover_path, t.status, a.name as artist
      from public.tracks t
      join public.artists a on a.id = t.artist_id
      join public.artist_members m on m.artist_id = t.artist_id and m.user_id = v_user
    ),
    p as (
      select s.track_id, count(*) filter (where s.counted) as plays,
        count(distinct s.user_id) as listeners,
        coalesce(sum(s.listened_ms), 0) as ms
      from public.play_sessions s
      where s.track_id in (select id from mine) and s.started_at >= v_since
      group by s.track_id
    )
    select jsonb_build_object(
      'since', v_since,
      'plays', coalesce((select sum(plays) from p), 0),
      'listeners', coalesce((
        select count(distinct s.user_id) from public.play_sessions s
        where s.track_id in (select id from mine) and s.started_at >= v_since), 0),
      'minutes', coalesce((select round(sum(ms) / 60000.0)::integer from p), 0),
      'likes', coalesce((select count(*) from public.likes l where l.track_id in (select id from mine)), 0),
      'tracks', coalesce((
        select jsonb_agg(x order by (x->>'plays')::integer desc) from (
          select jsonb_build_object('id', mine.id, 'title', mine.title, 'artist', mine.artist,
            'cover_path', mine.cover_path, 'status', mine.status,
            'plays', coalesce(p.plays, 0), 'listeners', coalesce(p.listeners, 0),
            'minutes', coalesce(round(p.ms / 60000.0)::integer, 0)) as x
          from mine left join p on p.track_id = mine.id) q), '[]'::jsonb)
    )
  );
end;
$$;
revoke execute on function public.my_artist_stats(integer) from public, anon;
grant execute on function public.my_artist_stats(integer) to authenticated;
