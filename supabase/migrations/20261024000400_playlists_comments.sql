-- =====================================================================================
-- Ordyx · 0004 · Playlists, comentarios e historial de búsqueda
-- =====================================================================================

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text check (char_length(description) <= 2000),
  cover_path text check (char_length(cover_path) <= 300),
  is_public boolean not null default false,
  -- Preparado para listas colaborativas (no activo todavía en la app).
  is_collaborative boolean not null default false,
  is_featured boolean not null default false,
  track_count integer not null default 0 check (track_count >= 0),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  save_count integer not null default 0 check (save_count >= 0),
  search_text text generated always as (public.normalize_search(title)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playlists_owner_idx on public.playlists (owner_id, updated_at desc);
create index playlists_public_idx on public.playlists (updated_at desc) where is_public;
create index playlists_featured_idx on public.playlists (updated_at desc) where is_featured and is_public;
create index playlists_search_trgm on public.playlists using gin (search_text extensions.gin_trgm_ops) where is_public;
create trigger playlists_updated_at before update on public.playlists
  for each row execute function public.set_updated_at();

alter table public.playlists enable row level security;
create policy "playlists: públicas, propias o moderación" on public.playlists for select to anon, authenticated
  using (is_public or owner_id = (select auth.uid()) or public.is_moderator());
create policy "playlists: crear" on public.playlists for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.is_active_user()
    and (cover_path is null or cover_path like (select auth.uid())::text || '/%')
  );
create policy "playlists: editar propias" on public.playlists for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (cover_path is null or cover_path like (select auth.uid())::text || '/%')
  );
create policy "playlists: borrar propias" on public.playlists for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
revoke all on public.playlists from anon, authenticated;
grant select on public.playlists to anon, authenticated;
grant insert (id, owner_id, title, description, cover_path, is_public) on public.playlists to authenticated;
grant update (title, description, cover_path, is_public) on public.playlists to authenticated;
grant delete on public.playlists to authenticated;

-- Límite anti-abuso de creación de playlists.
create or replace function public.playlists_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.playlists where owner_id = new.owner_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'ordyx:rate_limited';
  end if;
  return new;
end;
$$;
create trigger playlists_rate_limit before insert on public.playlists
  for each row execute function public.playlists_rate_limit();

create table public.playlist_tracks (
  id bigint generated always as identity primary key,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null default 0,
  added_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);
create index playlist_tracks_playlist_pos_idx on public.playlist_tracks (playlist_id, position);
create index playlist_tracks_track_idx on public.playlist_tracks (track_id);

alter table public.playlist_tracks enable row level security;
create policy "playlist_tracks: visibles si la playlist es visible" on public.playlist_tracks for select to anon, authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id));
create policy "playlist_tracks: añadir a playlists propias" on public.playlist_tracks for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid()))
    and exists (select 1 from public.tracks t where t.id = track_id and t.status = 'published')
  );
create policy "playlist_tracks: quitar de playlists propias" on public.playlist_tracks for delete to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())));
revoke all on public.playlist_tracks from anon, authenticated;
grant select on public.playlist_tracks to anon, authenticated;
grant insert (playlist_id, track_id, added_by) on public.playlist_tracks to authenticated;
grant delete on public.playlist_tracks to authenticated;
-- El orden se modifica con `public.move_playlist_track`.

create or replace function public.playlist_tracks_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  select count(*) into current_count from public.playlist_tracks where playlist_id = new.playlist_id;
  if current_count >= 5000 then
    raise exception 'ordyx:invalid_input' using detail = 'Una playlist admite como máximo 5000 canciones';
  end if;
  new.position := coalesce((select max(position) from public.playlist_tracks where playlist_id = new.playlist_id), 0) + 1;
  return new;
end;
$$;
create trigger playlist_tracks_before_insert before insert on public.playlist_tracks
  for each row execute function public.playlist_tracks_before_insert();

create or replace function public.refresh_playlist_stats(p_playlist_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.playlists p set
    track_count = s.n,
    duration_ms = s.total,
    updated_at = now()
  from (
    select count(*)::integer as n, coalesce(sum(t.duration_ms), 0)::bigint as total
    from public.playlist_tracks pt join public.tracks t on t.id = pt.track_id
    where pt.playlist_id = p_playlist_id
  ) s
  where p.id = p_playlist_id;
$$;

create or replace function public.playlist_tracks_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_playlist_stats(coalesce(new.playlist_id, old.playlist_id));
  return null;
end;
$$;
create trigger playlist_tracks_after_change after insert or delete on public.playlist_tracks
  for each row execute function public.playlist_tracks_after_change();

create table public.saved_playlists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, playlist_id)
);
alter table public.saved_playlists enable row level security;
create policy "saved_playlists: propias" on public.saved_playlists for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_playlists: guardar públicas ajenas" on public.saved_playlists for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.playlists p where p.id = playlist_id and p.is_public and p.owner_id <> (select auth.uid()))
  );
create policy "saved_playlists: quitar" on public.saved_playlists for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.saved_playlists from anon, authenticated;
grant select, insert, delete on public.saved_playlists to authenticated;

create or replace function public.on_saved_playlist_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.playlists set save_count = save_count + 1 where id = new.playlist_id;
    return new;
  end if;
  update public.playlists set save_count = greatest(save_count - 1, 0) where id = old.playlist_id;
  return old;
end;
$$;
create trigger saved_playlists_counters after insert or delete on public.saved_playlists
  for each row execute function public.on_saved_playlist_change();

-- ---------------------------------------------------------------- comentarios
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  -- Comentario anclado a un instante de la canción (estilo forma de onda).
  timestamp_ms integer check (timestamp_ms >= 0),
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_track_created_idx on public.comments (track_id, created_at desc);
create index comments_user_idx on public.comments (user_id, created_at desc);
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

alter table public.comments enable row level security;
create policy "comments: visibles salvo ocultos o bloqueados" on public.comments for select to anon, authenticated
  using (
    exists (select 1 from public.tracks t where t.id = track_id)
    and (not is_hidden or user_id = (select auth.uid()) or public.is_moderator())
    and not exists (select 1 from public.blocks b where b.blocker_id = (select auth.uid()) and b.blocked_id = comments.user_id)
  );
create policy "comments: comentar" on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and exists (
      select 1 from public.tracks t
      where t.id = track_id and t.status = 'published'
        and not public.is_blocked_between(t.owner_id, (select auth.uid()))
    )
  );
create policy "comments: editar propios" on public.comments for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "comments: borrar propios, en canciones propias o moderación" on public.comments for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_moderator()
    or exists (select 1 from public.tracks t where t.id = track_id and t.owner_id = (select auth.uid()))
  );
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (id, track_id, user_id, parent_id, body, timestamp_ms) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

create or replace function public.comments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_minute integer;
  recent_hour integer;
begin
  new.body := trim(new.body);
  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into recent_minute, recent_hour
  from public.comments
  where user_id = new.user_id and created_at > now() - interval '1 hour';
  if recent_minute >= 5 or recent_hour >= 60 then
    raise exception 'ordyx:rate_limited';
  end if;
  -- Antispam básico: mismo texto repetido en la última hora.
  if exists (
    select 1 from public.comments
    where user_id = new.user_id and lower(body) = lower(new.body) and created_at > now() - interval '1 hour'
  ) then
    raise exception 'ordyx:rate_limited' using detail = 'Comentario duplicado';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.comments c where c.id = new.parent_id and c.track_id = new.track_id and c.parent_id is null
  ) then
    raise exception 'ordyx:invalid_input' using detail = 'Respuesta no válida';
  end if;
  return new;
end;
$$;
create trigger comments_before_insert before insert on public.comments
  for each row execute function public.comments_before_insert();

create or replace function public.on_comment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.tracks set comment_count = comment_count + 1 where id = new.track_id;
    return new;
  end if;
  update public.tracks set comment_count = greatest(comment_count - 1, 0) where id = old.track_id;
  return old;
end;
$$;
create trigger comments_counters after insert or delete on public.comments
  for each row execute function public.on_comment_change();

-- ---------------------------------------------------------------- historial de búsquedas (sincronizado)
create table public.search_history (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  query text not null check (char_length(trim(query)) between 1 and 100),
  created_at timestamptz not null default now()
);
create index search_history_user_idx on public.search_history (user_id, created_at desc);
alter table public.search_history enable row level security;
create policy "search_history: propio" on public.search_history for select to authenticated using (user_id = (select auth.uid()));
create policy "search_history: añadir propio" on public.search_history for insert to authenticated with check (user_id = (select auth.uid()));
create policy "search_history: borrar propio" on public.search_history for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.search_history from anon, authenticated;
grant select, delete on public.search_history to authenticated;
grant insert (user_id, query) on public.search_history to authenticated;

-- Conserva solo las 30 búsquedas más recientes por usuario y evita duplicados consecutivos.
create or replace function public.search_history_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.search_history
  where user_id = new.user_id and id <> new.id and lower(query) = lower(new.query);
  delete from public.search_history
  where user_id = new.user_id
    and id not in (select id from public.search_history where user_id = new.user_id order by created_at desc, id desc limit 30);
  return null;
end;
$$;
create trigger search_history_after_insert after insert on public.search_history
  for each row execute function public.search_history_after_insert();
