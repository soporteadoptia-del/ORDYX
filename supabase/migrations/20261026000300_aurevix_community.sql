-- Catálogo de la comunidad: las canciones que cualquiera importa (de YouTube, SoundCloud o
-- Audius) se guardan aquí para que todo el mundo pueda encontrarlas y escucharlas en Aurevix.
-- Solo se guarda el enlace y sus datos públicos (título, artista, portada); el audio sigue
-- sonando con el reproductor oficial de cada servicio. La administración puede ocultarlas.

create table public.external_tracks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('youtube', 'soundcloud', 'audius')),
  ref text not null check (char_length(ref) between 1 and 300),
  title text not null check (char_length(trim(title)) between 1 and 200),
  artist text check (char_length(artist) <= 200),
  cover_url text check (cover_url ~ '^https://\S+$' and char_length(cover_url) <= 400),
  imported_by uuid references public.profiles (id) on delete set null,
  import_count integer not null default 1 check (import_count >= 0),
  is_hidden boolean not null default false,
  search_text text generated always as (public.normalize_search(title || ' ' || coalesce(artist, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, ref),
  -- Formato de cada referencia: id de YouTube, URL de SoundCloud o id de Audius.
  check (
    (source = 'youtube' and ref ~ '^[A-Za-z0-9_-]{11}$')
    or (source = 'soundcloud' and ref ~ '^https://(www\.|m\.)?soundcloud\.com/[^\s]+$')
    or (source = 'audius' and ref ~ '^[A-Za-z0-9]{1,40}$')
  )
);
create index external_tracks_popular_idx on public.external_tracks (import_count desc, created_at desc) where not is_hidden;
create index external_tracks_search_idx on public.external_tracks using gin (search_text extensions.gin_trgm_ops);

alter table public.external_tracks enable row level security;
create policy "external_tracks: visibles para todos" on public.external_tracks for select to anon, authenticated
  using (not is_hidden or private.is_moderator());
revoke all on public.external_tracks from anon, authenticated;
grant select on public.external_tracks to anon, authenticated;

-- Registrar lo importado (hasta 100 por llamada y 300 por hora por persona).
create or replace function public.register_external_tracks(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_item jsonb;
  v_n integer := 0;
begin
  if v_me is null or not private.is_active_user() then raise exception 'ordyx:not_allowed'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'ordyx:invalid_input';
  end if;
  if (select count(*) from public.external_tracks
      where imported_by = v_me and created_at > now() - interval '1 hour') > 300 then
    raise exception 'ordyx:rate_limited';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      insert into public.external_tracks (source, ref, title, artist, cover_url, imported_by)
      values (
        v_item->>'source',
        v_item->>'ref',
        left(trim(v_item->>'title'), 200),
        nullif(left(trim(coalesce(v_item->>'artist', '')), 200), ''),
        nullif(v_item->>'cover_url', ''),
        v_me
      )
      on conflict (source, ref) do update set
        import_count = public.external_tracks.import_count + 1,
        cover_url = coalesce(public.external_tracks.cover_url, excluded.cover_url),
        updated_at = now();
      v_n := v_n + 1;
    exception when check_violation or not_null_violation then
      -- Un elemento mal formado no impide guardar los demás.
      null;
    end;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.register_external_tracks(jsonb) from public, anon;
grant execute on function public.register_external_tracks(jsonb) to authenticated;

-- Buscar en el catálogo de la comunidad.
create or replace function public.search_external_tracks(p_query text, p_limit integer default 20)
returns setof public.external_tracks
language sql
stable
security invoker
set search_path = ''
as $$
  select * from public.external_tracks
  where not is_hidden
    and search_text like '%' || public.normalize_search(coalesce(p_query, '')) || '%'
    and char_length(trim(coalesce(p_query, ''))) > 1
  order by import_count desc, created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
grant execute on function public.search_external_tracks(text, integer) to anon, authenticated;

-- Ocultar o volver a mostrar (moderación).
create or replace function public.admin_set_external_hidden(p_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  update public.external_tracks set is_hidden = p_hidden, updated_at = now() where id = p_id;
  if not found then raise exception 'ordyx:not_found'; end if;
  perform public.write_audit_log(case when p_hidden then 'external.hide' else 'external.show' end,
    'external_track', p_id::text, '{}'::jsonb);
end;
$$;
revoke execute on function public.admin_set_external_hidden(uuid, boolean) from public, anon;
grant execute on function public.admin_set_external_hidden(uuid, boolean) to authenticated;
