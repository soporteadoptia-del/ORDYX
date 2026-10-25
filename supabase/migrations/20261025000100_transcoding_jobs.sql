-- =====================================================================================
-- Ordyx · 0012 · Cola de transcodificación de audio
-- El worker (services/transcoder) usa la clave service_role y estas funciones, que NO son
-- invocables por anon/authenticated. Varias instancias pueden trabajar en paralelo gracias a
-- `FOR UPDATE SKIP LOCKED`; un trabajo abandonado (>30 min) se vuelve a ofrecer hasta 3 veces.
-- =====================================================================================

alter table public.tracks
  add column if not exists original_audio_path text check (char_length(original_audio_path) <= 300),
  add column if not exists processing_attempts smallint not null default 0,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_error text;

create index if not exists tracks_processing_idx on public.tracks (created_at) where status = 'processing';

create or replace function public.claim_transcode_job()
returns table (track_id uuid, owner_id uuid, audio_path text, audio_mime text, attempt smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  select tr.id, tr.owner_id, tr.audio_path, tr.audio_mime, tr.processing_attempts
    into t
  from public.tracks tr
  where tr.status = 'processing'
    and tr.audio_path is not null
    and tr.processing_attempts < 3
    and (tr.processing_started_at is null or tr.processing_started_at < now() - interval '30 minutes')
  order by tr.created_at
  limit 1
  for update skip locked;
  if not found then return; end if;

  update public.tracks
    set processing_started_at = now(), processing_attempts = processing_attempts + 1
  where id = t.id;

  return query select t.id, t.owner_id, t.audio_path, t.audio_mime, (t.processing_attempts + 1)::smallint;
end;
$$;

-- Registra el resultado: la versión de streaming pasa a ser la que se reproduce; el original se conserva
-- (privado) para reprocesar. La duración y el tamaño son los MEDIDOS por el worker, no los del cliente.
create or replace function public.complete_transcode_job(
  p_track_id uuid,
  p_stream_path text,
  p_stream_mime text,
  p_stream_size bigint,
  p_duration_ms integer
)
returns public.track_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tracks%rowtype;
  verified boolean;
  next_status public.track_status;
begin
  select * into t from public.tracks where id = p_track_id for update;
  if not found or t.status <> 'processing' then raise exception 'ordyx:invalid_state'; end if;
  if p_stream_path not like t.owner_id::text || '/' || t.id::text || '/%' then
    raise exception 'ordyx:invalid_input' using detail = 'Ruta de streaming fuera de la carpeta de la canción';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'audio' and o.name = p_stream_path) then
    raise exception 'ordyx:audio_missing';
  end if;
  if p_duration_ms is null or p_duration_ms <= 0 or p_duration_ms > 4 * 60 * 60 * 1000 then
    raise exception 'ordyx:invalid_input' using detail = 'Duración no válida';
  end if;

  select a.is_verified into verified from public.artists a where a.id = t.artist_id;
  next_status := case
    when verified and coalesce((select value::text from public.app_config where key = 'auto_publish_verified_artists'), 'false') = 'true'
      then 'published'::public.track_status
    else 'pending_review'::public.track_status
  end;

  perform set_config('ordyx.trusted', 'on', true);
  update public.tracks set
    original_audio_path = coalesce(original_audio_path, audio_path),
    audio_path = p_stream_path,
    audio_mime = p_stream_mime,
    audio_size_bytes = p_stream_size,
    duration_ms = p_duration_ms,
    status = next_status,
    published_at = case when next_status = 'published' then now() else null end,
    processing_started_at = null,
    processing_error = null
  where id = p_track_id;
  perform set_config('ordyx.trusted', 'off', true);

  if next_status = 'published' then
    perform public.notify(t.owner_id, 'track_published', jsonb_build_object('track_id', t.id, 'title', t.title));
  end if;
  return next_status;
end;
$$;

-- Fallo: se reintenta (hasta 3 intentos) salvo que sea permanente (archivo inválido); entonces vuelve a
-- borrador con una explicación para el artista.
create or replace function public.fail_transcode_job(p_track_id uuid, p_error text, p_permanent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tracks%rowtype;
begin
  select * into t from public.tracks where id = p_track_id for update;
  if not found or t.status <> 'processing' then return; end if;
  if p_permanent or t.processing_attempts >= 3 then
    perform set_config('ordyx.trusted', 'on', true);
    update public.tracks set
      status = 'draft',
      processing_started_at = null,
      processing_error = left(p_error, 500),
      review_note = 'No hemos podido procesar el archivo de audio. Comprueba que no esté dañado y vuelve a subirlo.'
    where id = p_track_id;
    perform set_config('ordyx.trusted', 'off', true);
    perform public.notify(t.owner_id, 'track_rejected', jsonb_build_object('track_id', t.id, 'title', t.title,
      'note', 'No hemos podido procesar el archivo de audio.'));
  else
    update public.tracks set processing_started_at = null, processing_error = left(p_error, 500) where id = p_track_id;
  end if;
end;
$$;

revoke all on function public.claim_transcode_job() from public, anon, authenticated;
revoke all on function public.complete_transcode_job(uuid, text, text, bigint, integer) from public, anon, authenticated;
revoke all on function public.fail_transcode_job(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_transcode_job() to service_role;
grant execute on function public.complete_transcode_job(uuid, text, text, bigint, integer) to service_role;
grant execute on function public.fail_transcode_job(uuid, text, boolean) to service_role;

-- El propietario no debe poder escribir estas columnas: se mantienen fuera de los GRANT por columna.
