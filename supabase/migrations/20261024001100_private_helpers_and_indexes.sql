-- =====================================================================================
-- Ordyx · 0011 · Auxiliares de RLS fuera de la API e índices de claves foráneas
-- (corrige avisos del Security/Performance Advisor de Supabase)
--
-- Las funciones auxiliares que usan las políticas (is_admin, is_blocked_between, …) estaban en
-- `public`, por lo que PostgREST las exponía en /rest/v1/rpc/*. Se mueven al esquema `private`,
-- que la API no expone. Las políticas siguen funcionando (referencian la función por OID) y las
-- funciones que las invocaban por nombre se regeneran apuntando a `private`.
-- =====================================================================================
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.has_role(public.app_role) set schema private;
alter function public.is_admin() set schema private;
alter function public.is_moderator() set schema private;
alter function public.is_active_user() set schema private;
alter function public.is_blocked_between(uuid, uuid) set schema private;
alter function public.is_artist_member(uuid) set schema private;
alter function public.is_artist_owner(uuid) set schema private;
alter function public.can_upload() set schema private;
alter function public.can_view_track(public.track_status, uuid, uuid) set schema private;
alter function public.likes_are_public(uuid) set schema private;

-- Regenera las funciones cuyo cuerpo llama a las auxiliares por nombre (CREATE OR REPLACE conserva permisos).
do $$
declare
  f record;
  def text;
  helpers constant text := '(has_role|is_admin|is_moderator|is_active_user|is_blocked_between|is_artist_member|is_artist_owner|can_upload|can_view_track|likes_are_public)';
begin
  for f in
    select p.oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and p.prosrc ~ ('public\.' || helpers || '\(')
  loop
    def := pg_get_functiondef(f.oid);
    -- Solo se sustituyen llamadas dentro del cuerpo (la cabecera nunca nombra una auxiliar en `public`).
    def := regexp_replace(def, 'public\.' || helpers || '\(', 'private.\1(', 'g');
    execute def;
  end loop;
end;
$$;

-- ---------------------------------------------------------------- album_tracks: una política por acción
drop policy "album_tracks: gestionar como miembro" on public.album_tracks;
create policy "album_tracks: añadir como miembro" on public.album_tracks for insert to authenticated
  with check (
    exists (
      select 1 from public.albums a join public.tracks t on t.id = track_id
      where a.id = album_id and t.artist_id = a.artist_id and private.is_artist_member(a.artist_id)
    )
  );
create policy "album_tracks: reordenar como miembro" on public.album_tracks for update to authenticated
  using (exists (select 1 from public.albums a where a.id = album_id and private.is_artist_member(a.artist_id)))
  with check (exists (select 1 from public.albums a where a.id = album_id and private.is_artist_member(a.artist_id)));
create policy "album_tracks: quitar como miembro" on public.album_tracks for delete to authenticated
  using (exists (select 1 from public.albums a where a.id = album_id and private.is_artist_member(a.artist_id)));

-- ---------------------------------------------------------------- índices de claves foráneas
create index if not exists albums_created_by_idx on public.albums (created_by);
create index if not exists app_config_updated_by_idx on public.app_config (updated_by);
create index if not exists app_versions_created_by_idx on public.app_versions (created_by);
create index if not exists app_versions_verified_by_idx on public.app_versions (verified_by);
create index if not exists artists_created_by_idx on public.artists (created_by);
create index if not exists client_errors_user_idx on public.client_errors (user_id, created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_id) where parent_id is not null;
create index if not exists listening_history_session_idx on public.listening_history (session_id);
create index if not exists listening_history_track_idx on public.listening_history (track_id);
create index if not exists play_events_session_idx on public.play_events (session_id);
create index if not exists play_events_user_idx on public.play_events (user_id);
create index if not exists playlist_tracks_added_by_idx on public.playlist_tracks (added_by);
create index if not exists reports_resolved_by_idx on public.reports (resolved_by);
create index if not exists rights_claims_resolved_by_idx on public.rights_claims (resolved_by);
create index if not exists rights_claims_submitted_by_idx on public.rights_claims (submitted_by);
create index if not exists rights_claims_track_idx on public.rights_claims (track_id);
create index if not exists saved_albums_album_idx on public.saved_albums (album_id);
create index if not exists saved_playlists_playlist_idx on public.saved_playlists (playlist_id);
create index if not exists user_roles_granted_by_idx on public.user_roles (granted_by);
