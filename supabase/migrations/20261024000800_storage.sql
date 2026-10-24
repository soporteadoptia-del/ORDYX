-- =====================================================================================
-- Ordyx · 0008 · Supabase Storage: buckets y políticas
--   avatars, covers, playlist-images → públicos para lectura (imágenes), escritura en carpeta propia.
--   audio                            → PRIVADO. Se reproduce con URLs firmadas de corta duración,
--                                      que Storage solo emite si la política SELECT lo permite.
--   releases                         → binarios de la app (APK). Lectura pública, escritura admin.
-- La primera carpeta de cada ruta es el auth.uid() del propietario.
-- =====================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('playlist-images', 'playlist-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('audio', 'audio', false, 209715200,
    array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac', 'audio/ogg']),
  ('releases', 'releases', true, null, array['application/vnd.android.package-archive', 'application/octet-stream'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- imágenes
create policy "images: lectura" on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'covers', 'playlist-images'));

create policy "images: subir a carpeta propia" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'covers', 'playlist-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
  );
create policy "images: actualizar en carpeta propia" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'covers', 'playlist-images') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('avatars', 'covers', 'playlist-images') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "images: borrar en carpeta propia" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'covers', 'playlist-images') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------- audio (privado)
-- Ruta obligatoria: {uid}/{track_id}/original.{ext}. Solo se puede subir para una canción propia
-- en borrador o rechazada; así Storage no puede usarse como alojamiento genérico de archivos.
create policy "audio: subir original de una canción propia en borrador" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.can_upload()
    and exists (
      select 1 from public.tracks t
      where t.id::text = (storage.foldername(name))[2]
        and t.owner_id = (select auth.uid())
        and t.status in ('draft', 'rejected')
    )
  );
create policy "audio: reemplazar original en borrador" on storage.objects for update to authenticated
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.tracks t
      where t.id::text = (storage.foldername(name))[2] and t.owner_id = (select auth.uid()) and t.status in ('draft', 'rejected')
    )
  )
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "audio: borrar propios" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Lectura (incluida la emisión de URLs firmadas): canciones publicadas para usuarios con sesión,
-- y cualquier estado para su propietario, miembros del artista y moderación.
create policy "audio: escuchar canciones visibles" on storage.objects for select to authenticated
  using (
    bucket_id = 'audio'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.tracks t
        where t.audio_path = storage.objects.name
          and public.can_view_track(t.status, t.owner_id, t.artist_id)
      )
    )
  );

-- ---------------------------------------------------------------- binarios de la app
create policy "releases: lectura pública" on storage.objects for select to anon, authenticated
  using (bucket_id = 'releases');
create policy "releases: escritura solo administración" on storage.objects for insert to authenticated
  with check (bucket_id = 'releases' and public.is_admin());
create policy "releases: actualización solo administración" on storage.objects for update to authenticated
  using (bucket_id = 'releases' and public.is_admin()) with check (bucket_id = 'releases' and public.is_admin());
create policy "releases: borrado solo administración" on storage.objects for delete to authenticated
  using (bucket_id = 'releases' and public.is_admin());
