-- Funciones sociales al estilo SoundCloud y Spotify:
-- 1. Reposts: compartir una canción en tu perfil para quien te sigue.
-- 2. `my_feed`: actividad de lo que sigues (lanzamientos de tus artistas y reposts de tus amigos).
-- 3. `my_top_genres`: tus géneros más escuchados, para los «Mix diarios» (gratis).
-- 4. `user_reposts`: reposts públicos de un perfil.

create table public.reposts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index reposts_track_idx on public.reposts (track_id);
create index reposts_user_created_idx on public.reposts (user_id, created_at desc);

alter table public.reposts enable row level security;
create policy "reposts: lectura" on public.reposts for select to authenticated
  using (
    user_id = (select auth.uid())
    or not private.is_blocked_between((select auth.uid()), user_id)
  );
create policy "reposts: repostear canciones publicadas" on public.reposts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_active_user()
    and exists (select 1 from public.tracks t where t.id = track_id and t.status = 'published')
  );
create policy "reposts: quitar" on public.reposts for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.reposts from anon, authenticated;
grant select, insert, delete on public.reposts to authenticated;

-- Actividad: lanzamientos de artistas que sigo y reposts de personas que sigo, lo más nuevo primero.
create or replace function public.my_feed(p_limit integer default 40, p_before timestamptz default null)
returns table (
  kind text,
  track_id uuid,
  actor_id uuid,
  actor_name text,
  actor_username text,
  actor_image text,
  at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  releases as (
    select 'release'::text as kind, t.id as track_id, a.id as actor_id, a.name as actor_name,
      null::text as actor_username, a.image_path as actor_image, t.published_at as at
    from public.artist_follows f
    join public.tracks t on t.artist_id = f.artist_id and t.status = 'published'
    join public.artists a on a.id = t.artist_id
    where f.user_id = (select id from me) and t.published_at is not null
  ),
  reps as (
    select 'repost'::text, r.track_id, p.id, coalesce(p.display_name, p.username::text),
      p.username::text, p.avatar_path, r.created_at
    from public.follows f
    join public.reposts r on r.user_id = f.followee_id
    join public.tracks t on t.id = r.track_id and t.status = 'published'
    join public.profiles p on p.id = r.user_id and p.status = 'active'
    where f.follower_id = (select id from me)
      and not private.is_blocked_between((select id from me), r.user_id)
  )
  select * from (select * from releases union all select * from reps) x
  where (select id from me) is not null
    and (p_before is null or x.at < p_before)
  order by x.at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;
revoke execute on function public.my_feed(integer, timestamptz) from public, anon;
grant execute on function public.my_feed(integer, timestamptz) to authenticated;

-- Géneros que más escucho (últimos 90 días) para los Mix diarios.
create or replace function public.my_top_genres(p_limit integer default 3)
returns table (genre_id integer, name text, minutes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id::integer, g.name::text, round(sum(s.listened_ms) / 60000.0)::integer
  from public.play_sessions s
  join public.tracks t on t.id = s.track_id
  join public.genres g on g.id = t.genre_id
  where s.user_id = (select auth.uid()) and s.started_at > now() - interval '90 days'
  group by g.id, g.name
  order by sum(s.listened_ms) desc
  limit greatest(1, least(coalesce(p_limit, 3), 10));
$$;
revoke execute on function public.my_top_genres(integer) from public, anon;
grant execute on function public.my_top_genres(integer) to authenticated;
