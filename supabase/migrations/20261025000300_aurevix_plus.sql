-- Aurevix Plus (4,99 €/mes): suscripción, pagos por Bizum revisados a mano, letras sincronizadas,
-- estadísticas de escucha y audio original (sin pérdida) para suscriptores.
--
-- Bizum no permite cobros automáticos: el usuario pide el plan (se le da un código de referencia),
-- hace el Bizum con ese concepto y la administración confirma el pago, lo que activa o alarga el
-- plan un mes. No hay renovación automática: el plan caduca y se vuelve a pedir.

-- ---------------------------------------------------------------- configuración pública
insert into public.app_config (key, value, is_public, description) values
  ('plus_monthly_price_cents', '499', true, 'Precio mensual de Aurevix Plus en céntimos de euro.'),
  ('plus_bizum_phone', '"602708111"', true, 'Teléfono al que se envía el Bizum de Aurevix Plus.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------- suscripciones
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null default 'plus' check (plan in ('plus')),
  expires_at timestamptz not null,
  source text not null check (source in ('bizum', 'gift')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
alter table public.subscriptions enable row level security;
create policy "subscriptions: propia o administración" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- ¿Tiene este usuario Plus en vigor? (auxiliar de RLS: en `private`, fuera de la API)
create or replace function private.is_plus(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s where s.user_id = p_user and s.expires_at > now()
  );
$$;
revoke execute on function private.is_plus(uuid) from public, anon;
grant execute on function private.is_plus(uuid) to authenticated;

-- ---------------------------------------------------------------- pagos por Bizum
create table public.plus_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reference text not null unique check (reference ~ '^AUR-[A-Z0-9]{6}$'),
  months smallint not null default 1 check (months between 1 and 12),
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  payer_note text check (char_length(payer_note) <= 120),
  review_note text check (char_length(review_note) <= 300),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index plus_payments_user_idx on public.plus_payments (user_id, created_at desc);
create index plus_payments_pending_idx on public.plus_payments (created_at) where status = 'pending';
-- Una sola solicitud pendiente por usuario.
create unique index plus_payments_one_pending on public.plus_payments (user_id) where status = 'pending';
alter table public.plus_payments enable row level security;
create policy "plus_payments: propios o administración" on public.plus_payments for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
revoke all on public.plus_payments from anon, authenticated;
grant select on public.plus_payments to authenticated;

-- Estado del plan del usuario actual (para la app).
create or replace function public.my_plus()
returns table (
  active boolean,
  expires_at timestamptz,
  source text,
  pending_id uuid,
  pending_reference text,
  pending_amount_cents integer,
  pending_created_at timestamptz,
  last_rejection_note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(s.expires_at > now(), false),
    s.expires_at,
    s.source,
    p.id,
    p.reference,
    p.amount_cents,
    p.created_at,
    (select r.review_note from public.plus_payments r
      where r.user_id = (select auth.uid()) and r.status = 'rejected'
        and r.reviewed_at > now() - interval '7 days'
      order by r.reviewed_at desc limit 1)
  from (select 1) as one
  left join public.subscriptions s on s.user_id = (select auth.uid())
  left join public.plus_payments p on p.user_id = (select auth.uid()) and p.status = 'pending';
$$;

-- El usuario pide Plus: devuelve su solicitud pendiente o crea una con un código de referencia.
create or replace function public.request_plus(p_payer_note text default null)
returns public.plus_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_row public.plus_payments;
  v_ref text;
  v_price integer;
begin
  if v_user is null or not private.is_active_user() then raise exception 'ordyx:not_allowed'; end if;
  select * into v_row from public.plus_payments where user_id = v_user and status = 'pending';
  if found then
    if p_payer_note is not null then
      update public.plus_payments set payer_note = left(trim(p_payer_note), 120) where id = v_row.id
      returning * into v_row;
    end if;
    return v_row;
  end if;
  select (value #>> '{}')::integer into v_price from public.app_config where key = 'plus_monthly_price_cents';
  loop
    v_ref := 'AUR-' || upper(substr(translate(pg_catalog.gen_random_uuid()::text, '-01', ''), 1, 6));
    exit when length(v_ref) = 10 and not exists (select 1 from public.plus_payments where reference = v_ref);
  end loop;
  insert into public.plus_payments (user_id, reference, months, amount_cents, payer_note)
  values (v_user, v_ref, 1, coalesce(v_price, 499), nullif(left(trim(coalesce(p_payer_note, '')), 120), ''))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.cancel_plus_request(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.plus_payments set status = 'cancelled'
  where id = p_id and user_id = (select auth.uid()) and status = 'pending';
$$;

-- Alarga (o crea) la suscripción de un usuario. Interna.
create or replace function private.extend_plus(p_user uuid, p_months integer, p_source text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires timestamptz;
begin
  insert into public.subscriptions (user_id, expires_at, source)
  values (p_user, now() + make_interval(months => p_months), p_source)
  on conflict (user_id) do update
    set expires_at = greatest(public.subscriptions.expires_at, now()) + make_interval(months => p_months),
        source = excluded.source
  returning expires_at into v_expires;
  return v_expires;
end;
$$;
revoke execute on function private.extend_plus(uuid, integer, text) from public, anon, authenticated;

-- La administración confirma o rechaza un Bizum.
create or replace function public.admin_review_plus_payment(p_id uuid, p_approve boolean, p_note text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.plus_payments;
  v_expires timestamptz;
begin
  perform public.assert_admin();
  select * into v_pay from public.plus_payments where id = p_id for update;
  if not found then raise exception 'ordyx:not_found'; end if;
  if v_pay.status <> 'pending' then
    raise exception 'ordyx:invalid_state' using detail = 'Esta solicitud ya se ha revisado';
  end if;
  update public.plus_payments
     set status = case when p_approve then 'approved' else 'rejected' end,
         review_note = nullif(left(trim(coalesce(p_note, '')), 300), ''),
         reviewed_by = (select auth.uid()), reviewed_at = now()
   where id = p_id;
  if p_approve then
    v_expires := private.extend_plus(v_pay.user_id, v_pay.months, 'bizum');
    perform public.notify(v_pay.user_id, 'system',
      jsonb_build_object('kind', 'plus_activated', 'expires_at', v_expires, 'reference', v_pay.reference));
  else
    perform public.notify(v_pay.user_id, 'system',
      jsonb_build_object('kind', 'plus_rejected', 'reference', v_pay.reference, 'note', p_note));
  end if;
  perform public.write_audit_log(case when p_approve then 'plus.approve' else 'plus.reject' end,
    'plus_payment', p_id::text, jsonb_build_object('user', v_pay.user_id, 'reference', v_pay.reference));
  return v_expires;
end;
$$;

-- La administración regala meses de Plus (pruebas, artistas, sorteos).
create or replace function public.admin_grant_plus(p_user uuid, p_months integer, p_note text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires timestamptz;
begin
  perform public.assert_admin();
  if p_months not between 1 and 24 then raise exception 'ordyx:invalid_input'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'ordyx:not_found'; end if;
  v_expires := private.extend_plus(p_user, p_months, 'gift');
  perform public.notify(p_user, 'system', jsonb_build_object('kind', 'plus_gift', 'expires_at', v_expires));
  perform public.write_audit_log('plus.gift', 'user', p_user::text,
    jsonb_build_object('months', p_months, 'note', p_note));
  return v_expires;
end;
$$;

-- ---------------------------------------------------------------- letras
-- Texto libre o formato LRC ([mm:ss.xx] línea) para que avancen con la canción. Solo se leen
-- mediante get_lyrics (Plus, o el propio artista), no con la lectura general de la tabla.
alter table public.tracks add column if not exists lyrics text check (char_length(lyrics) <= 20000);

do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'tracks' and column_name not in ('lyrics');
  execute 'revoke select on public.tracks from anon, authenticated';
  execute format('grant select (%s) on public.tracks to anon, authenticated', cols);
end $$;
grant update (lyrics) on public.tracks to authenticated;
grant insert (lyrics) on public.tracks to authenticated;

create or replace function public.get_lyrics(p_track_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_track public.tracks;
begin
  select * into v_track from public.tracks where id = p_track_id;
  if not found or not private.can_view_track(v_track.status, v_track.owner_id, v_track.artist_id) then
    raise exception 'ordyx:not_found';
  end if;
  if v_track.owner_id = (select auth.uid()) or private.is_plus((select auth.uid())) or private.is_moderator() then
    return v_track.lyrics;
  end if;
  raise exception 'ordyx:plus_required';
end;
$$;

-- ¿Tiene letra? (para mostrar el botón sin revelarla)
create or replace function public.has_lyrics(p_track_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(char_length(t.lyrics) > 0, false)
  from public.tracks t
  where t.id = p_track_id and private.can_view_track(t.status, t.owner_id, t.artist_id);
$$;

-- ---------------------------------------------------------------- estadísticas (Plus)
create or replace function public.my_listening_stats(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3660)));
  v_result jsonb;
begin
  if v_user is null then raise exception 'ordyx:not_allowed'; end if;
  if not private.is_plus(v_user) then raise exception 'ordyx:plus_required'; end if;
  with s as (
    select ps.track_id, ps.listened_ms, ps.started_at
    from public.play_sessions ps
    where ps.user_id = v_user and ps.started_at >= v_since and ps.listened_ms > 0
  ),
  t as (
    select s.track_id, count(*) as plays, sum(s.listened_ms) as ms
    from s group by s.track_id
  )
  select jsonb_build_object(
    'since', v_since,
    'minutes', coalesce((select round(sum(listened_ms) / 60000.0)::integer from s), 0),
    'plays', (select count(*) from s),
    'distinct_tracks', (select count(*) from t),
    'top_tracks', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('id', tr.id, 'title', tr.title, 'cover_path', tr.cover_path,
          'artist', ar.name, 'plays', t.plays, 'minutes', round(t.ms / 60000.0)::integer) as x
        from t join public.tracks tr on tr.id = t.track_id
        left join public.artists ar on ar.id = tr.artist_id
        order by t.ms desc limit 5) q), '[]'::jsonb),
    'top_artists', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('id', ar.id, 'name', ar.name, 'image_path', ar.image_path,
          'minutes', round(sum(t.ms) / 60000.0)::integer) as x
        from t join public.tracks tr on tr.id = t.track_id
        join public.artists ar on ar.id = tr.artist_id
        group by ar.id, ar.name, ar.image_path
        order by sum(t.ms) desc limit 5) q), '[]'::jsonb),
    'top_genres', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('id', g.id, 'name', g.name,
          'minutes', round(sum(t.ms) / 60000.0)::integer) as x
        from t join public.tracks tr on tr.id = t.track_id
        join public.genres g on g.id = tr.genre_id
        group by g.id, g.name
        order by sum(t.ms) desc limit 5) q), '[]'::jsonb),
    'by_hour', coalesce((
      select jsonb_agg(jsonb_build_object('hour', h, 'minutes', m) order by h) from (
        select extract(hour from s.started_at at time zone 'Europe/Madrid')::integer as h,
               round(sum(s.listened_ms) / 60000.0)::integer as m
        from s group by 1) q), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------- audio original para Plus
-- El original (WAV/FLAC sin pérdida cuando el artista lo subió así) se guarda aparte cuando la
-- transcodificación crea la versión comprimida. Los suscriptores Plus pueden pedir su URL firmada.
create policy "audio: original para Plus" on storage.objects for select to authenticated
  using (
    bucket_id = 'audio'
    and private.is_plus((select auth.uid()))
    and exists (
      select 1 from public.tracks t
      where t.original_audio_path = storage.objects.name and t.status = 'published'
    )
  );

-- ---------------------------------------------------------------- permisos de las funciones
revoke execute on function public.my_plus() from public, anon;
revoke execute on function public.request_plus(text) from public, anon;
revoke execute on function public.cancel_plus_request(uuid) from public, anon;
revoke execute on function public.admin_review_plus_payment(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_grant_plus(uuid, integer, text) from public, anon;
revoke execute on function public.get_lyrics(uuid) from public, anon;
revoke execute on function public.has_lyrics(uuid) from public;
revoke execute on function public.my_listening_stats(integer) from public, anon;
grant execute on function public.my_plus() to authenticated;
grant execute on function public.request_plus(text) to authenticated;
grant execute on function public.cancel_plus_request(uuid) to authenticated;
grant execute on function public.admin_review_plus_payment(uuid, boolean, text) to authenticated;
grant execute on function public.admin_grant_plus(uuid, integer, text) to authenticated;
grant execute on function public.get_lyrics(uuid) to authenticated;
grant execute on function public.has_lyrics(uuid) to anon, authenticated;
grant execute on function public.my_listening_stats(integer) to authenticated;
