-- =====================================================================================
-- Ordyx · 0003 · Catálogo: artistas, géneros, álbumes y canciones
-- Los archivos de audio NO se guardan en PostgreSQL: solo su ruta en Supabase Storage.
-- =====================================================================================

-- ---------------------------------------------------------------- artistas
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name text not null check (char_length(trim(name)) between 1 and 80),
  image_path text check (char_length(image_path) <= 300),
  bio text check (char_length(bio) <= 2000),
  links jsonb not null default '{}'::jsonb check (jsonb_typeof(links) = 'object'),
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  follower_count integer not null default 0 check (follower_count >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  search_text text generated always as (public.normalize_search(name)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artists_search_trgm on public.artists using gin (search_text extensions.gin_trgm_ops);
create index artists_featured_idx on public.artists (is_featured) where is_featured;
create trigger artists_updated_at before update on public.artists
  for each row execute function public.set_updated_at();

create table public.artist_members (
  artist_id uuid not null references public.artists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);
create index artist_members_user_idx on public.artist_members (user_id);

create or replace function public.is_artist_member(p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.artist_members m
    where m.artist_id = p_artist_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_artist_owner(p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.artist_members m
    where m.artist_id = p_artist_id and m.user_id = (select auth.uid()) and m.member_role = 'owner'
  );
$$;

-- Solo usuarios activos con rol `artist` (concedido por un administrador) o administradores pueden publicar.
create or replace function public.can_upload()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and (public.has_role('artist') or public.has_role('admin'));
$$;

alter table public.artists enable row level security;
create policy "artists: lectura pública" on public.artists for select to anon, authenticated using (true);
create policy "artists: crear (artistas autorizados)" on public.artists for insert to authenticated
  with check (
    public.can_upload()
    and created_by = (select auth.uid())
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );
create policy "artists: editar (miembros)" on public.artists for update to authenticated
  using (public.is_artist_member(id))
  with check (public.is_artist_member(id));
revoke all on public.artists from anon, authenticated;
grant select on public.artists to anon, authenticated;
grant insert (slug, name, image_path, bio, links, created_by) on public.artists to authenticated;
grant update (name, image_path, bio, links) on public.artists to authenticated;
-- is_verified / is_featured / borrado: solo mediante funciones admin_*.

-- Si la imagen cambia, debe estar en la carpeta del usuario que la cambia.
create or replace function public.artists_image_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.image_path is distinct from old.image_path
     and new.image_path is not null
     and (select auth.uid()) is not null
     and new.image_path not like (select auth.uid())::text || '/%' then
    raise exception 'ordyx:not_allowed' using detail = 'Ruta de imagen no permitida';
  end if;
  return new;
end;
$$;
create trigger artists_image_guard before update on public.artists
  for each row execute function public.artists_image_guard();

create or replace function public.on_artist_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.artist_members (artist_id, user_id, member_role) values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger artists_after_insert after insert on public.artists
  for each row execute function public.on_artist_created();

alter table public.artist_members enable row level security;
create policy "artist_members: lectura pública" on public.artist_members for select to anon, authenticated using (true);
create policy "artist_members: el propietario añade editores" on public.artist_members for insert to authenticated
  with check (public.is_artist_owner(artist_id) and member_role = 'editor');
create policy "artist_members: el propietario retira editores" on public.artist_members for delete to authenticated
  using (public.is_artist_owner(artist_id) and member_role = 'editor');
revoke all on public.artist_members from anon, authenticated;
grant select on public.artist_members to anon, authenticated;
grant insert, delete on public.artist_members to authenticated;

-- ---------------------------------------------------------------- seguidores de artistas
create table public.artist_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
create index artist_follows_artist_idx on public.artist_follows (artist_id);

alter table public.artist_follows enable row level security;
create policy "artist_follows: propios" on public.artist_follows for select to authenticated
  using (user_id = (select auth.uid()));
create policy "artist_follows: seguir" on public.artist_follows for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());
create policy "artist_follows: dejar de seguir" on public.artist_follows for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.artist_follows from anon, authenticated;
grant select, insert, delete on public.artist_follows to authenticated;

create or replace function public.on_artist_follow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.artists set follower_count = follower_count + 1 where id = new.artist_id;
    return new;
  end if;
  update public.artists set follower_count = greatest(follower_count - 1, 0) where id = old.artist_id;
  return old;
end;
$$;
create trigger artist_follows_counters after insert or delete on public.artist_follows
  for each row execute function public.on_artist_follow_change();

-- ---------------------------------------------------------------- géneros
create table public.genres (
  id smallint generated by default as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 40),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
alter table public.genres enable row level security;
create policy "genres: lectura pública" on public.genres for select to anon, authenticated using (true);
revoke all on public.genres from anon, authenticated;
grant select on public.genres to anon, authenticated;

-- ---------------------------------------------------------------- canciones
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (char_length(description) <= 2000),
  genre_id smallint references public.genres (id) on delete set null,
  cover_path text check (char_length(cover_path) <= 300),
  -- Referencia al archivo en el bucket privado `audio` (o, en el futuro, a otro proveedor/CDN).
  audio_path text unique check (char_length(audio_path) <= 300),
  audio_mime text,
  audio_size_bytes bigint check (audio_size_bytes > 0),
  storage_provider text not null default 'supabase' check (storage_provider in ('supabase', 'external')),
  duration_ms integer check (duration_ms > 0 and duration_ms <= 4 * 60 * 60 * 1000),
  status public.track_status not null default 'draft',
  license text not null default 'all-rights-reserved'
    check (license in ('all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd', 'cc0')),
  rights_holder text check (char_length(rights_holder) <= 200),
  rights_confirmed_at timestamptz,
  isrc text check (isrc ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),
  is_explicit boolean not null default false,
  -- Contenido de demostración generado por el proyecto: se muestra etiquetado en la app.
  is_demo boolean not null default false,
  release_date date,
  published_at timestamptz,
  review_note text,
  play_count bigint not null default 0 check (play_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  search_text text generated always as (public.normalize_search(title)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- No se puede publicar sin audio, duración ni confirmación de derechos.
  constraint tracks_published_requirements check (
    status <> 'published'
    or (audio_path is not null and duration_ms is not null and rights_confirmed_at is not null and published_at is not null)
  )
);
create index tracks_artist_idx on public.tracks (artist_id, published_at desc);
create index tracks_owner_idx on public.tracks (owner_id, created_at desc);
create index tracks_status_published_idx on public.tracks (published_at desc) where status = 'published';
create index tracks_popular_idx on public.tracks (play_count desc) where status = 'published';
create index tracks_genre_idx on public.tracks (genre_id) where status = 'published';
create index tracks_pending_idx on public.tracks (created_at) where status = 'pending_review';
create index tracks_search_trgm on public.tracks using gin (search_text extensions.gin_trgm_ops);
create trigger tracks_updated_at before update on public.tracks
  for each row execute function public.set_updated_at();

create or replace function public.can_view_track(p_status public.track_status, p_owner uuid, p_artist uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_status = 'published'
      or p_owner = (select auth.uid())
      or public.is_artist_member(p_artist)
      or public.is_moderator();
$$;

alter table public.tracks enable row level security;
create policy "tracks: publicadas o del propio equipo o moderación"
  on public.tracks for select to anon, authenticated
  using (public.can_view_track(status, owner_id, artist_id));
create policy "tracks: crear como miembro del artista" on public.tracks for insert to authenticated
  with check (
    public.can_upload()
    and owner_id = (select auth.uid())
    and public.is_artist_member(artist_id)
    and status = 'draft'
    and (audio_path is null or audio_path like (select auth.uid())::text || '/%')
    and (cover_path is null or cover_path like (select auth.uid())::text || '/%')
  );
create policy "tracks: editar propias" on public.tracks for update to authenticated
  using (owner_id = (select auth.uid()) and status <> 'removed')
  with check (
    owner_id = (select auth.uid())
    and public.is_active_user()
    and (audio_path is null or audio_path like (select auth.uid())::text || '/%')
    and (cover_path is null or cover_path like (select auth.uid())::text || '/%')
  );
create policy "tracks: borrar propias o moderación" on public.tracks for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

revoke all on public.tracks from anon, authenticated;
grant select on public.tracks to anon, authenticated;
grant insert (id, artist_id, owner_id, title, description, genre_id, cover_path, audio_path, audio_mime,
              audio_size_bytes, duration_ms, license, rights_holder, isrc, is_explicit, release_date)
  on public.tracks to authenticated;
grant update (title, description, genre_id, cover_path, audio_path, audio_mime, audio_size_bytes,
              duration_ms, license, rights_holder, isrc, is_explicit, release_date)
  on public.tracks to authenticated;
grant delete on public.tracks to authenticated;
-- status, published_at, rights_confirmed_at, contadores y review_note solo cambian vía funciones del servidor.

-- Una canción publicada no puede cambiar de archivo de audio sin volver a revisión.
create or replace function public.tracks_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('ordyx.trusted', true) = 'on' then
    return new;
  end if;
  if (new.audio_path is distinct from old.audio_path or new.duration_ms is distinct from old.duration_ms)
     and old.status not in ('draft', 'rejected') then
    raise exception 'ordyx:invalid_state' using detail = 'El audio solo puede cambiarse en borradores o canciones rechazadas';
  end if;
  return new;
end;
$$;
create trigger tracks_guard before update on public.tracks
  for each row execute function public.tracks_guard();

-- ---------------------------------------------------------------- álbumes
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  cover_path text check (char_length(cover_path) <= 300),
  description text check (char_length(description) <= 2000),
  release_date date,
  status public.album_status not null default 'draft',
  save_count integer not null default 0 check (save_count >= 0),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  search_text text generated always as (public.normalize_search(title)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index albums_artist_idx on public.albums (artist_id, release_date desc);
create index albums_search_trgm on public.albums using gin (search_text extensions.gin_trgm_ops);
create trigger albums_updated_at before update on public.albums
  for each row execute function public.set_updated_at();

alter table public.albums enable row level security;
create policy "albums: publicados o de miembros o moderación" on public.albums for select to anon, authenticated
  using (status = 'published' or public.is_artist_member(artist_id) or public.is_moderator());
create policy "albums: crear como miembro" on public.albums for insert to authenticated
  with check (
    public.can_upload() and public.is_artist_member(artist_id) and created_by = (select auth.uid())
    and status in ('draft', 'published')
    and (cover_path is null or cover_path like (select auth.uid())::text || '/%')
  );
create policy "albums: editar como miembro" on public.albums for update to authenticated
  using (public.is_artist_member(artist_id) and status <> 'removed')
  with check (public.is_artist_member(artist_id) and status in ('draft', 'published'));
create policy "albums: borrar como miembro" on public.albums for delete to authenticated
  using (public.is_artist_member(artist_id) or public.is_admin());
revoke all on public.albums from anon, authenticated;
grant select on public.albums to anon, authenticated;
grant insert (id, artist_id, title, cover_path, description, release_date, status, created_by) on public.albums to authenticated;
grant update (title, cover_path, description, release_date, status) on public.albums to authenticated;
grant delete on public.albums to authenticated;

create table public.album_tracks (
  album_id uuid not null references public.albums (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position smallint not null check (position > 0),
  primary key (album_id, track_id),
  unique (album_id, position) deferrable initially deferred
);
create index album_tracks_track_idx on public.album_tracks (track_id);

alter table public.album_tracks enable row level security;
create policy "album_tracks: visibles si el álbum es visible" on public.album_tracks for select to anon, authenticated
  using (exists (select 1 from public.albums a where a.id = album_id));
create policy "album_tracks: gestionar como miembro" on public.album_tracks for all to authenticated
  using (exists (select 1 from public.albums a where a.id = album_id and public.is_artist_member(a.artist_id)))
  with check (
    exists (
      select 1 from public.albums a join public.tracks t on t.id = track_id
      where a.id = album_id and t.artist_id = a.artist_id and public.is_artist_member(a.artist_id)
    )
  );
revoke all on public.album_tracks from anon, authenticated;
grant select on public.album_tracks to anon, authenticated;
grant insert, update, delete on public.album_tracks to authenticated;

-- ---------------------------------------------------------------- "me gusta" (favoritos)
create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index likes_user_created_idx on public.likes (user_id, created_at desc);
create index likes_track_idx on public.likes (track_id);

-- Lee la preferencia de privacidad sin exponer el resto de ajustes del usuario.
create or replace function public.likes_are_public(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.show_likes_public from public.user_settings s where s.user_id = p_user), false);
$$;

alter table public.likes enable row level security;
create policy "likes: propios o públicos según privacidad" on public.likes for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.likes_are_public(user_id)
  );
create policy "likes: dar me gusta" on public.likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and exists (select 1 from public.tracks t where t.id = track_id and t.status = 'published')
  );
create policy "likes: quitar me gusta" on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.likes from anon, authenticated;
grant select, insert, delete on public.likes to authenticated;

create or replace function public.on_like_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.tracks set like_count = like_count + 1 where id = new.track_id;
    if (select count(*) from public.likes where user_id = new.user_id and created_at > now() - interval '1 minute') > 60 then
      raise exception 'ordyx:rate_limited';
    end if;
    return new;
  end if;
  update public.tracks set like_count = greatest(like_count - 1, 0) where id = old.track_id;
  return old;
end;
$$;
create trigger likes_counters after insert or delete on public.likes
  for each row execute function public.on_like_change();

-- ---------------------------------------------------------------- álbumes guardados
create table public.saved_albums (
  user_id uuid not null references public.profiles (id) on delete cascade,
  album_id uuid not null references public.albums (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, album_id)
);
alter table public.saved_albums enable row level security;
create policy "saved_albums: propios" on public.saved_albums for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_albums: guardar" on public.saved_albums for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.albums a where a.id = album_id and a.status = 'published'));
create policy "saved_albums: quitar" on public.saved_albums for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.saved_albums from anon, authenticated;
grant select, insert, delete on public.saved_albums to authenticated;

create or replace function public.on_saved_album_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.albums set save_count = save_count + 1 where id = new.album_id;
    return new;
  end if;
  update public.albums set save_count = greatest(save_count - 1, 0) where id = old.album_id;
  return old;
end;
$$;
create trigger saved_albums_counters after insert or delete on public.saved_albums
  for each row execute function public.on_saved_album_change();
