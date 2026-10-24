-- =====================================================================================
-- Ordyx · 0007 · Funciones de servidor (RPC)
-- Toda operación sensible (publicar, contar reproducciones, moderar, versiones) pasa por aquí.
-- =====================================================================================

-- ---------------------------------------------------------------- búsqueda
-- SECURITY INVOKER: las políticas RLS filtran automáticamente lo que el usuario puede ver.
create or replace function public.search_catalog(
  p_query text,
  p_kind text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (kind text, id uuid, title text, subtitle text, image_path text, rank real)
language plpgsql
stable
set search_path = ''
as $$
declare
  q text := public.normalize_search(left(trim(coalesce(p_query, '')), 100));
  pattern text;
  lim integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  off integer := greatest(coalesce(p_offset, 0), 0);
begin
  if char_length(q) < 1 then
    return;
  end if;
  if p_kind is not null and p_kind not in ('track', 'artist', 'album', 'playlist', 'profile') then
    raise exception 'ordyx:invalid_input';
  end if;
  pattern := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select r.kind, r.id, r.title, r.subtitle, r.image_path, r.rank::real
  from (
    select 'track'::text as kind, t.id, t.title, a.name as subtitle, coalesce(t.cover_path, a.image_path) as image_path,
           greatest(extensions.similarity(t.search_text, q), extensions.similarity(a.search_text, q) * 0.9)
             + least(t.play_count, 100000) / 1000000.0 as rank
    from public.tracks t join public.artists a on a.id = t.artist_id
    where t.status = 'published' and (p_kind is null or p_kind = 'track')
      and (t.search_text like pattern or a.search_text like pattern or t.search_text operator(extensions.%) q)
    union all
    select 'artist', a.id, a.name, null, a.image_path,
           extensions.similarity(a.search_text, q) + case when a.is_verified then 0.05 else 0 end
    from public.artists a
    where (p_kind is null or p_kind = 'artist') and (a.search_text like pattern or a.search_text operator(extensions.%) q)
    union all
    select 'album', al.id, al.title, a.name, al.cover_path, extensions.similarity(al.search_text, q)
    from public.albums al join public.artists a on a.id = al.artist_id
    where al.status = 'published' and (p_kind is null or p_kind = 'album') and al.search_text like pattern
    union all
    select 'playlist', p.id, p.title, pr.username::text, p.cover_path, extensions.similarity(p.search_text, q)
    from public.playlists p join public.profiles pr on pr.id = p.owner_id
    where p.is_public and (p_kind is null or p_kind = 'playlist') and p.search_text like pattern
    union all
    select 'profile', pr.id, coalesce(pr.display_name, pr.username::text), '@' || pr.username::text, pr.avatar_path,
           extensions.similarity(pr.search_text, q)
    from public.profiles pr
    where (p_kind is null or p_kind = 'profile') and pr.status = 'active' and pr.search_text like pattern
  ) r
  order by r.rank desc, r.title
  limit lim offset off;
end;
$$;

-- ---------------------------------------------------------------- reproducciones
-- Regla: válida si se escuchan >= 30 s (o >= 90 % si la canción dura menos).
-- Antimanipulación: el tiempo escuchado nunca puede superar el tiempo real transcurrido desde
-- el inicio de la sesión (+2 s de tolerancia) ni la duración de la canción; una reproducción
-- válida del mismo usuario y canción solo vuelve a contar tras 5 minutos (evita contar recargas,
-- repeticiones automáticas en bucle o varias sesiones simultáneas).
create or replace function public.start_play(
  p_track_id uuid,
  p_source text default null,
  p_context_type text default null,
  p_context_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  t record;
  session_id uuid;
begin
  if uid is null then raise exception 'ordyx:not_allowed'; end if;
  if not public.is_active_user() then raise exception 'ordyx:account_suspended'; end if;

  select id, status, owner_id, artist_id, audio_path into t from public.tracks where id = p_track_id;
  if not found or not public.can_view_track(t.status, t.owner_id, t.artist_id) then
    raise exception 'ordyx:not_found';
  end if;
  if t.audio_path is null then raise exception 'ordyx:audio_missing'; end if;

  if (select count(*) from public.play_sessions where user_id = uid and started_at > now() - interval '1 hour') >= 300 then
    raise exception 'ordyx:rate_limited';
  end if;

  insert into public.play_sessions (user_id, track_id, source)
  values (uid, p_track_id, left(p_source, 40))
  returning id into session_id;

  insert into public.play_events (session_id, user_id, track_id, event_type, position_ms)
  values (session_id, uid, p_track_id, 'start', 0);

  insert into public.listening_history (user_id, track_id, session_id, context_type, context_id)
  values (
    uid, p_track_id, session_id,
    case when p_context_type in ('playlist', 'album', 'artist', 'search', 'home', 'library', 'track', 'profile', 'queue') then p_context_type end,
    left(p_context_id, 64)
  );

  -- Mantener el historial acotado (últimas 500 entradas por usuario).
  delete from public.listening_history
  where user_id = uid
    and id < (select min(id) from (select id from public.listening_history where user_id = uid order by id desc limit 500) s);

  return session_id;
end;
$$;

create or replace function public.report_play_progress(
  p_session_id uuid,
  p_listened_ms integer,
  p_completed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s public.play_sessions%rowtype;
  dur integer;
  elapsed_ms bigint;
  accepted integer;
  threshold integer;
  recently_counted boolean;
begin
  if uid is null then raise exception 'ordyx:not_allowed'; end if;
  select * into s from public.play_sessions where id = p_session_id and user_id = uid for update;
  if not found then raise exception 'ordyx:not_found'; end if;
  if s.started_at < now() - interval '12 hours' then
    return jsonb_build_object('is_valid', s.is_valid, 'counted', s.counted, 'listened_ms', s.listened_ms);
  end if;

  select duration_ms into dur from public.tracks where id = s.track_id;
  elapsed_ms := (extract(epoch from (now() - s.started_at)) * 1000)::bigint + 2000;
  accepted := least(greatest(coalesce(p_listened_ms, 0), 0)::bigint, elapsed_ms, coalesce(dur, 2147483647)::bigint)::integer;
  accepted := greatest(accepted, s.listened_ms);
  threshold := least(30000, (coalesce(dur, 30000) * 0.9)::integer);

  update public.play_sessions set listened_ms = accepted, last_seen_at = now() where id = s.id;

  if not s.is_valid and accepted >= threshold then
    select exists (
      select 1 from public.play_sessions o
      where o.user_id = uid and o.track_id = s.track_id and o.id <> s.id
        and o.counted and o.validated_at > now() - interval '5 minutes'
    ) into recently_counted;

    update public.play_sessions
      set is_valid = true, counted = not recently_counted, validated_at = now()
      where id = s.id;
    insert into public.play_events (session_id, user_id, track_id, event_type, position_ms)
      values (s.id, uid, s.track_id, 'valid', accepted);
    if not recently_counted then
      update public.tracks set play_count = play_count + 1 where id = s.track_id;
    end if;
    s.is_valid := true;
    s.counted := not recently_counted;
  end if;

  if p_completed and not s.completed and dur is not null and accepted >= (dur * 0.9)::integer then
    update public.play_sessions set completed = true where id = s.id;
    insert into public.play_events (session_id, user_id, track_id, event_type, position_ms)
      values (s.id, uid, s.track_id, 'complete', accepted);
    s.completed := true;
  end if;

  return jsonb_build_object('is_valid', s.is_valid, 'counted', s.counted, 'completed', s.completed, 'listened_ms', accepted);
end;
$$;

-- Reproducciones recientes (sin duplicados) del usuario actual.
create or replace function public.recently_played(p_limit integer default 20)
returns table (track_id uuid, played_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select h.track_id, max(h.played_at) as played_at
  from public.listening_history h
  join public.tracks t on t.id = h.track_id
  where h.user_id = (select auth.uid())
  group by h.track_id
  order by max(h.played_at) desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- ---------------------------------------------------------------- playlists
create or replace function public.move_playlist_track(p_item_id bigint, p_new_position integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  total integer;
  target integer;
begin
  select pt.id, pt.playlist_id, pt.position into item
  from public.playlist_tracks pt join public.playlists p on p.id = pt.playlist_id
  where pt.id = p_item_id and p.owner_id = (select auth.uid())
  for update of pt;
  if not found then raise exception 'ordyx:not_allowed'; end if;

  -- Normaliza posiciones 1..n antes de mover.
  with ordered as (
    select id, row_number() over (order by position, id) as rn from public.playlist_tracks where playlist_id = item.playlist_id
  )
  update public.playlist_tracks pt set position = o.rn from ordered o where pt.id = o.id;

  select count(*), (select position from public.playlist_tracks where id = p_item_id)
    into total, item.position
  from public.playlist_tracks where playlist_id = item.playlist_id;
  target := least(greatest(p_new_position, 1), total);
  if target = item.position then return; end if;

  if target < item.position then
    update public.playlist_tracks set position = position + 1
    where playlist_id = item.playlist_id and position >= target and position < item.position;
  else
    update public.playlist_tracks set position = position - 1
    where playlist_id = item.playlist_id and position > item.position and position <= target;
  end if;
  update public.playlist_tracks set position = target where id = p_item_id;
  update public.playlists set updated_at = now() where id = item.playlist_id;
end;
$$;

-- ---------------------------------------------------------------- publicación de canciones
create or replace function public.submit_track(p_track_id uuid, p_rights_confirmed boolean)
returns public.track_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  t public.tracks%rowtype;
  obj record;
  verified boolean;
  next_status public.track_status;
begin
  if uid is null then raise exception 'ordyx:not_allowed'; end if;
  if not public.can_upload() then raise exception 'ordyx:not_allowed'; end if;
  if coalesce(p_rights_confirmed, false) is not true then raise exception 'ordyx:rights_required'; end if;

  select * into t from public.tracks where id = p_track_id and owner_id = uid for update;
  if not found then raise exception 'ordyx:not_found'; end if;
  if t.status not in ('draft', 'rejected') then raise exception 'ordyx:invalid_state'; end if;
  if t.audio_path is null or t.duration_ms is null then raise exception 'ordyx:audio_missing'; end if;
  if t.rights_holder is null then raise exception 'ordyx:rights_required'; end if;

  -- El archivo debe existir realmente en Storage; tamaño y tipo se toman del servidor, no del cliente.
  select o.metadata into obj from storage.objects o where o.bucket_id = 'audio' and o.name = t.audio_path;
  if not found then raise exception 'ordyx:audio_missing'; end if;

  select a.is_verified into verified from public.artists a where a.id = t.artist_id;

  if coalesce((select value::text from public.app_config where key = 'transcoding_enabled'), 'false') = 'true' then
    next_status := 'processing';
  elsif verified and coalesce((select value::text from public.app_config where key = 'auto_publish_verified_artists'), 'false') = 'true' then
    next_status := 'published';
  else
    next_status := 'pending_review';
  end if;

  perform set_config('ordyx.trusted', 'on', true);
  update public.tracks set
    status = next_status,
    rights_confirmed_at = now(),
    audio_size_bytes = coalesce((obj.metadata ->> 'size')::bigint, audio_size_bytes),
    audio_mime = coalesce(obj.metadata ->> 'mimetype', audio_mime),
    published_at = case when next_status = 'published' then now() else null end,
    review_note = null
  where id = p_track_id;
  perform set_config('ordyx.trusted', 'off', true);

  return next_status;
end;
$$;

-- El propietario retira su canción de la publicación (vuelve a borrador).
create or replace function public.unpublish_own_track(p_track_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tracks set status = 'draft', published_at = null
  where id = p_track_id and owner_id = (select auth.uid()) and status in ('published', 'pending_review', 'processing');
  if not found then raise exception 'ordyx:invalid_state'; end if;
end;
$$;

-- ---------------------------------------------------------------- reclamaciones y errores
create or replace function public.submit_rights_claim(
  p_claimant_name text,
  p_claimant_email text,
  p_content_url text,
  p_original_work text,
  p_details text,
  p_good_faith boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_id uuid;
  maybe_track uuid;
begin
  if coalesce(p_good_faith, false) is not true then raise exception 'ordyx:invalid_input'; end if;
  if (select count(*) from public.rights_claims where lower(claimant_email) = lower(trim(p_claimant_email)) and created_at > now() - interval '1 day') >= 5
     or (select count(*) from public.rights_claims where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'ordyx:rate_limited';
  end if;
  -- Si la URL contiene el ID de una canción, se enlaza automáticamente.
  begin
    maybe_track := (regexp_match(p_content_url, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1]::uuid;
  exception when others then
    maybe_track := null;
  end;
  if maybe_track is not null and not exists (select 1 from public.tracks where id = maybe_track) then
    maybe_track := null;
  end if;

  insert into public.rights_claims (claimant_name, claimant_email, content_url, track_id, original_work, details, good_faith_statement, submitted_by)
  values (trim(p_claimant_name), lower(trim(p_claimant_email)), trim(p_content_url), maybe_track, trim(p_original_work), trim(p_details), true, (select auth.uid()))
  returning id into claim_id;
  return claim_id;
exception
  when check_violation then raise exception 'ordyx:invalid_input';
end;
$$;

create or replace function public.log_client_error(
  p_app text,
  p_app_version text,
  p_platform text,
  p_message text,
  p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if p_app not in ('mobile', 'web', 'admin') then return; end if;
  if uid is not null and (select count(*) from public.client_errors where user_id = uid and created_at > now() - interval '1 hour') >= 30 then
    return;
  end if;
  if uid is null and (select count(*) from public.client_errors where user_id is null and created_at > now() - interval '1 minute') >= 30 then
    return;
  end if;
  insert into public.client_errors (user_id, app, app_version, platform, message, context)
  values (uid, p_app, left(p_app_version, 30), left(p_platform, 30), left(coalesce(p_message, ''), 1000),
          case when jsonb_typeof(p_context) = 'object' and pg_column_size(p_context) < 4000 then p_context else '{}'::jsonb end);
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set read_at = now() where user_id = (select auth.uid()) and read_at is null;
$$;

-- Exportación de datos personales (derecho de acceso/portabilidad, RGPD art. 15 y 20).
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'search_text' from public.profiles p where p.id = (select auth.uid())),
    'settings', (select to_jsonb(s) from public.user_settings s where s.user_id = (select auth.uid())),
    'email', (select u.email from auth.users u where u.id = (select auth.uid())),
    'playlists', coalesce((select jsonb_agg(to_jsonb(p) - 'search_text') from public.playlists p where p.owner_id = (select auth.uid())), '[]'::jsonb),
    'likes', coalesce((select jsonb_agg(jsonb_build_object('track_id', l.track_id, 'created_at', l.created_at)) from public.likes l where l.user_id = (select auth.uid())), '[]'::jsonb),
    'follows', coalesce((select jsonb_agg(jsonb_build_object('followee_id', f.followee_id, 'created_at', f.created_at)) from public.follows f where f.follower_id = (select auth.uid())), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'track_id', c.track_id, 'body', c.body, 'created_at', c.created_at)) from public.comments c where c.user_id = (select auth.uid())), '[]'::jsonb),
    'tracks', coalesce((select jsonb_agg(to_jsonb(t) - 'search_text') from public.tracks t where t.owner_id = (select auth.uid())), '[]'::jsonb),
    'listening_history', coalesce((select jsonb_agg(jsonb_build_object('track_id', h.track_id, 'played_at', h.played_at)) from public.listening_history h where h.user_id = (select auth.uid())), '[]'::jsonb),
    'search_history', coalesce((select jsonb_agg(jsonb_build_object('query', s.query, 'created_at', s.created_at)) from public.search_history s where s.user_id = (select auth.uid())), '[]'::jsonb)
  )
  where (select auth.uid()) is not null;
$$;

-- =====================================================================================
-- Administración. Cada función valida el rol en el servidor y deja traza en admin_audit_logs.
-- =====================================================================================

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'ordyx:not_allowed'; end if;
end;
$$;

create or replace function public.assert_moderator()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then raise exception 'ordyx:not_allowed'; end if;
end;
$$;

-- Creación controlada del primer administrador. Solo ejecutable con la clave service_role o desde
-- el editor SQL del panel de Supabase; falla si ya existe algún administrador.
create or replace function public.bootstrap_first_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'ordyx:admin_exists';
  end if;
  select id into target from auth.users where lower(email) = lower(trim(p_email));
  if target is null then raise exception 'ordyx:not_found'; end if;
  insert into public.user_roles (user_id, role) values (target, 'admin');
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values (null, 'bootstrap_first_admin', 'user', target::text, jsonb_build_object('email', lower(trim(p_email))));
  return target;
end;
$$;

create or replace function public.admin_list_users(p_query text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, username text, display_name text, email text, status public.account_status,
  roles public.app_role[], created_at timestamptz, last_sign_in_at timestamptz, email_confirmed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  return query
  select p.id, p.username::text, p.display_name, u.email::text, p.status,
         coalesce(array_agg(r.role order by r.role) filter (where r.role is not null), '{}'),
         p.created_at, u.last_sign_in_at, u.email_confirmed_at is not null
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.user_roles r on r.user_id = p.id
  where p_query is null or p_query = ''
     or p.search_text like '%' || public.normalize_search(p_query) || '%'
     or lower(u.email) like '%' || lower(p_query) || '%'
  group by p.id, u.email, u.last_sign_in_at, u.email_confirmed_at
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_set_user_status(p_user uuid, p_status public.account_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_user = (select auth.uid()) then raise exception 'ordyx:not_allowed' using detail = 'No puedes suspender tu propia cuenta'; end if;
  update public.profiles set status = p_status, suspended_reason = case when p_status = 'suspended' then p_reason end where id = p_user;
  if not found then raise exception 'ordyx:not_found'; end if;
  perform public.write_audit_log('user.set_status', 'user', p_user::text, jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_user = (select auth.uid()) and p_role = 'admin' and not p_grant then
    raise exception 'ordyx:not_allowed' using detail = 'No puedes retirarte el rol de administrador';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, (select auth.uid())) on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user and role = p_role;
  end if;
  perform public.write_audit_log(case when p_grant then 'role.grant' else 'role.revoke' end, 'user', p_user::text, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_review_track(p_track_id uuid, p_decision text, p_note text default null)
returns public.track_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tracks%rowtype;
  new_status public.track_status;
begin
  perform public.assert_moderator();
  select * into t from public.tracks where id = p_track_id for update;
  if not found then raise exception 'ordyx:not_found'; end if;

  new_status := case p_decision
    when 'publish' then 'published'::public.track_status
    when 'reject' then 'rejected'::public.track_status
    when 'remove' then 'removed'::public.track_status
    when 'restore' then 'pending_review'::public.track_status
    else null end;
  if new_status is null then raise exception 'ordyx:invalid_input'; end if;
  if new_status = 'published' and (t.audio_path is null or t.rights_confirmed_at is null or t.duration_ms is null) then
    raise exception 'ordyx:invalid_state' using detail = 'Faltan audio, duración o confirmación de derechos';
  end if;
  if p_decision = 'restore' and t.status <> 'removed' then raise exception 'ordyx:invalid_state'; end if;

  perform set_config('ordyx.trusted', 'on', true);
  update public.tracks set
    status = new_status,
    review_note = p_note,
    published_at = case when new_status = 'published' then coalesce(published_at, now()) else null end
  where id = p_track_id;
  perform set_config('ordyx.trusted', 'off', true);

  perform public.notify(t.owner_id,
    case new_status when 'published' then 'track_published' when 'rejected' then 'track_rejected' when 'removed' then 'track_removed' else 'system' end,
    jsonb_build_object('track_id', t.id, 'title', t.title, 'note', p_note));
  perform public.write_audit_log('track.' || p_decision, 'track', p_track_id::text,
    jsonb_build_object('from', t.status, 'to', new_status, 'note', p_note));
  return new_status;
end;
$$;

create or replace function public.admin_set_comment_hidden(p_comment_id uuid, p_hidden boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  update public.comments set is_hidden = p_hidden, hidden_reason = case when p_hidden then p_reason end where id = p_comment_id;
  if not found then raise exception 'ordyx:not_found'; end if;
  perform public.write_audit_log(case when p_hidden then 'comment.hide' else 'comment.unhide' end, 'comment', p_comment_id::text, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rep public.reports%rowtype;
begin
  perform public.assert_moderator();
  update public.reports set status = p_status, resolution_note = p_note,
    resolved_by = case when p_status in ('resolved', 'dismissed') then (select auth.uid()) end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
  where id = p_report_id
  returning * into rep;
  if not found then raise exception 'ordyx:not_found'; end if;
  if rep.reporter_id is not null and p_status in ('resolved', 'dismissed') then
    perform public.notify(rep.reporter_id, 'report_resolved', jsonb_build_object('report_id', rep.id, 'status', p_status));
  end if;
  perform public.write_audit_log('report.' || p_status, 'report', p_report_id::text, jsonb_build_object('note', p_note, 'target_type', rep.target_type, 'target_id', rep.target_id));
end;
$$;

create or replace function public.admin_resolve_rights_claim(p_claim_id uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  update public.rights_claims set status = p_status, resolution_note = p_note,
    resolved_by = case when p_status in ('resolved', 'dismissed') then (select auth.uid()) end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
  where id = p_claim_id;
  if not found then raise exception 'ordyx:not_found'; end if;
  perform public.write_audit_log('rights_claim.' || p_status, 'rights_claim', p_claim_id::text, jsonb_build_object('note', p_note));
end;
$$;

create or replace function public.admin_set_artist_flags(p_artist_id uuid, p_verified boolean, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.artists set is_verified = p_verified, is_featured = p_featured where id = p_artist_id;
  if not found then raise exception 'ordyx:not_found'; end if;
  perform public.write_audit_log('artist.flags', 'artist', p_artist_id::text, jsonb_build_object('verified', p_verified, 'featured', p_featured));
end;
$$;

create or replace function public.admin_set_playlist_featured(p_playlist_id uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.playlists set is_featured = p_featured where id = p_playlist_id and (is_public or not p_featured);
  if not found then raise exception 'ordyx:invalid_state'; end if;
  perform public.write_audit_log('playlist.featured', 'playlist', p_playlist_id::text, jsonb_build_object('featured', p_featured));
end;
$$;

create or replace function public.admin_upsert_genre(p_slug text, p_name text, p_sort_order smallint default 0)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid smallint;
begin
  perform public.assert_admin();
  insert into public.genres (slug, name, sort_order) values (p_slug, p_name, coalesce(p_sort_order, 0))
  on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order
  returning id into gid;
  perform public.write_audit_log('genre.upsert', 'genre', gid::text, jsonb_build_object('slug', p_slug, 'name', p_name));
  return gid;
end;
$$;

create or replace function public.admin_delete_genre(p_genre_id smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  delete from public.genres where id = p_genre_id;
  if not found then raise exception 'ordyx:not_found'; end if;
  perform public.write_audit_log('genre.delete', 'genre', p_genre_id::text, '{}'::jsonb);
end;
$$;

create or replace function public.admin_set_config(p_key text, p_value jsonb, p_is_public boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  insert into public.app_config (key, value, is_public, updated_by) values (p_key, p_value, p_is_public, (select auth.uid()))
  on conflict (key) do update set value = excluded.value, is_public = excluded.is_public, updated_by = excluded.updated_by;
  perform public.write_audit_log('config.set', 'config', p_key, jsonb_build_object('value', p_value, 'is_public', p_is_public));
end;
$$;

-- ---------------------------------------------------------------- versiones de la app
-- Crea o edita una versión en borrador. Una versión publicada o retirada no se edita: se crea otra.
create or replace function public.admin_save_app_version(p_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  vid uuid := p_id;
  cur public.app_versions%rowtype;
begin
  perform public.assert_admin();
  if vid is null then
    insert into public.app_versions (platform, channel, version, build_number, install_method, release_notes, min_os_version,
                                     download_url, storage_path, file_size_bytes, sha256, created_by)
    values ((p_data ->> 'platform')::public.app_platform, coalesce((p_data ->> 'channel')::public.release_channel, 'stable'),
            p_data ->> 'version', (p_data ->> 'build_number')::integer, (p_data ->> 'install_method')::public.install_method,
            p_data ->> 'release_notes', p_data ->> 'min_os_version', nullif(p_data ->> 'download_url', ''),
            nullif(p_data ->> 'storage_path', ''), (p_data ->> 'file_size_bytes')::bigint, nullif(lower(p_data ->> 'sha256'), ''),
            (select auth.uid()))
    returning id into vid;
    perform public.write_audit_log('app_version.create', 'app_version', vid::text, p_data);
  else
    select * into cur from public.app_versions where id = vid for update;
    if not found then raise exception 'ordyx:not_found'; end if;
    if cur.status <> 'draft' then raise exception 'ordyx:invalid_state'; end if;
    update public.app_versions set
      platform = (p_data ->> 'platform')::public.app_platform,
      channel = coalesce((p_data ->> 'channel')::public.release_channel, 'stable'),
      version = p_data ->> 'version',
      build_number = (p_data ->> 'build_number')::integer,
      install_method = (p_data ->> 'install_method')::public.install_method,
      release_notes = p_data ->> 'release_notes',
      min_os_version = p_data ->> 'min_os_version',
      download_url = nullif(p_data ->> 'download_url', ''),
      storage_path = nullif(p_data ->> 'storage_path', ''),
      file_size_bytes = (p_data ->> 'file_size_bytes')::bigint,
      sha256 = nullif(lower(p_data ->> 'sha256'), ''),
      -- cualquier cambio invalida la verificación previa
      verified_at = null,
      verified_by = null
    where id = vid;
    perform public.write_audit_log('app_version.update', 'app_version', vid::text, p_data);
  end if;
  return vid;
exception
  when check_violation or invalid_text_representation or not_null_violation then
    raise exception 'ordyx:invalid_input' using detail = sqlerrm;
  when unique_violation then
    raise exception 'ordyx:invalid_input' using detail = 'Ya existe esa versión y compilación para la plataforma y el canal';
end;
$$;

-- Registra la verificación. Para un APK, el panel descarga el archivo en el servidor, calcula su
-- SHA-256 y tamaño, y los envía aquí: deben coincidir exactamente con los declarados.
-- Si el binario está en Storage (bucket `releases`), además se comprueba que el objeto exista.
create or replace function public.admin_verify_app_version(p_id uuid, p_measured_sha256 text, p_measured_size bigint, p_install_tested boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.app_versions%rowtype;
begin
  perform public.assert_admin();
  select * into v from public.app_versions where id = p_id for update;
  if not found then raise exception 'ordyx:not_found'; end if;
  if v.status <> 'draft' then raise exception 'ordyx:invalid_state'; end if;
  if coalesce(p_install_tested, false) is not true then
    raise exception 'ordyx:invalid_input' using detail = 'Confirma que has probado la instalación en un dispositivo real';
  end if;
  if v.install_method = 'apk' then
    if lower(coalesce(p_measured_sha256, '')) <> v.sha256 or p_measured_size is distinct from v.file_size_bytes then
      raise exception 'ordyx:invalid_input' using detail = 'El SHA-256 o el tamaño medidos no coinciden con los declarados';
    end if;
  end if;
  if v.storage_path is not null and not exists (
    select 1 from storage.objects o where o.bucket_id = 'releases' and o.name = v.storage_path
  ) then
    raise exception 'ordyx:not_found' using detail = 'El archivo no existe en el bucket releases';
  end if;
  update public.app_versions set verified_at = now(), verified_by = (select auth.uid()) where id = p_id;
  perform public.write_audit_log('app_version.verify', 'app_version', p_id::text,
    jsonb_build_object('sha256', p_measured_sha256, 'size', p_measured_size));
end;
$$;

create or replace function public.admin_publish_app_version(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.app_versions%rowtype;
begin
  perform public.assert_admin();
  select * into v from public.app_versions where id = p_id for update;
  if not found then raise exception 'ordyx:not_found'; end if;
  if v.status <> 'draft' or v.verified_at is null then
    raise exception 'ordyx:invalid_state' using detail = 'Solo se pueden publicar borradores verificados';
  end if;
  update public.app_versions set status = 'published', published_at = now() where id = p_id;
  perform public.write_audit_log('app_version.publish', 'app_version', p_id::text,
    jsonb_build_object('platform', v.platform, 'channel', v.channel, 'version', v.version, 'build', v.build_number));
end;
$$;

create or replace function public.admin_withdraw_app_version(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'ordyx:invalid_input'; end if;
  update public.app_versions set status = 'withdrawn', withdrawn_at = now(), withdrawn_reason = p_reason
  where id = p_id and status = 'published';
  if not found then raise exception 'ordyx:invalid_state'; end if;
  perform public.write_audit_log('app_version.withdraw', 'app_version', p_id::text, jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------- estadísticas (solo agregados)
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_suspended', (select count(*) from public.profiles where status = 'suspended'),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_users_1d', (select count(distinct user_id) from public.play_sessions where started_at > now() - interval '1 day'),
    'active_users_7d', (select count(distinct user_id) from public.play_sessions where started_at > now() - interval '7 days'),
    'active_users_30d', (select count(distinct user_id) from public.play_sessions where started_at > now() - interval '30 days'),
    'play_starts_1d', (select count(*) from public.play_sessions where started_at > now() - interval '1 day'),
    'valid_plays_1d', (select count(*) from public.play_sessions where counted and validated_at > now() - interval '1 day'),
    'valid_plays_7d', (select count(*) from public.play_sessions where counted and validated_at > now() - interval '7 days'),
    'completed_plays_7d', (select count(*) from public.play_sessions where completed and started_at > now() - interval '7 days'),
    'tracks_published', (select count(*) from public.tracks where status = 'published'),
    'tracks_pending', (select count(*) from public.tracks where status = 'pending_review'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'rights_claims_open', (select count(*) from public.rights_claims where status in ('open', 'reviewing')),
    'errors_1d', (select count(*) from public.client_errors where created_at > now() - interval '1 day'),
    'top_tracks_7d', coalesce((
      select jsonb_agg(x) from (
        select t.id, t.title, a.name as artist, count(*) as plays
        from public.play_sessions s join public.tracks t on t.id = s.track_id join public.artists a on a.id = t.artist_id
        where s.counted and s.validated_at > now() - interval '7 days'
        group by t.id, t.title, a.name order by count(*) desc limit 10
      ) x), '[]'::jsonb)
  );
end;
$$;

-- =====================================================================================
-- Permisos de ejecución: por defecto PostgreSQL concede EXECUTE a PUBLIC. Se revoca todo y se
-- concede de forma explícita solo lo que cada rol necesita.
-- =====================================================================================
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

-- Funciones auxiliares usadas dentro de políticas RLS (deben poder ejecutarlas los roles de la API).
grant execute on function
  public.normalize_search(text),
  public.has_role(public.app_role),
  public.is_admin(),
  public.is_moderator(),
  public.is_active_user(),
  public.is_blocked_between(uuid, uuid),
  public.is_artist_member(uuid),
  public.is_artist_owner(uuid),
  public.likes_are_public(uuid),
  public.can_upload(),
  public.can_view_track(public.track_status, uuid, uuid)
to anon, authenticated;

-- RPC públicas
grant execute on function
  public.search_catalog(text, text, integer, integer),
  public.submit_rights_claim(text, text, text, text, text, boolean),
  public.log_client_error(text, text, text, text, jsonb)
to anon, authenticated;

-- RPC de usuarios autenticados
grant execute on function
  public.start_play(uuid, text, text, text),
  public.report_play_progress(uuid, integer, boolean),
  public.recently_played(integer),
  public.move_playlist_track(bigint, integer),
  public.submit_track(uuid, boolean),
  public.unpublish_own_track(uuid),
  public.mark_all_notifications_read(),
  public.export_my_data(),
  public.admin_list_users(text, integer, integer),
  public.admin_set_user_status(uuid, public.account_status, text),
  public.admin_set_role(uuid, public.app_role, boolean),
  public.admin_review_track(uuid, text, text),
  public.admin_set_comment_hidden(uuid, boolean, text),
  public.admin_resolve_report(uuid, public.report_status, text),
  public.admin_resolve_rights_claim(uuid, public.report_status, text),
  public.admin_set_artist_flags(uuid, boolean, boolean),
  public.admin_set_playlist_featured(uuid, boolean),
  public.admin_upsert_genre(text, text, smallint),
  public.admin_delete_genre(smallint),
  public.admin_set_config(text, jsonb, boolean),
  public.admin_save_app_version(uuid, jsonb),
  public.admin_verify_app_version(uuid, text, bigint, boolean),
  public.admin_publish_app_version(uuid),
  public.admin_withdraw_app_version(uuid, text),
  public.admin_stats()
to authenticated;

-- bootstrap_first_admin: solo service_role (y el propietario postgres).
grant execute on function public.bootstrap_first_admin(text) to service_role;

-- Las funciones creadas en el futuro no serán ejecutables por defecto desde la API.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
