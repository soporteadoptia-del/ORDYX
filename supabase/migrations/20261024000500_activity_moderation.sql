-- =====================================================================================
-- Ordyx · 0005 · Escuchas, historial, notificaciones, denuncias y reclamaciones
-- Los datos de escucha son privados: solo su titular puede leerlos. Las estadísticas
-- agregadas para administración se obtienen con funciones que no exponen datos individuales.
-- =====================================================================================

-- Una sesión = una reproducción iniciada. Solo el servidor decide si es una reproducción válida.
create table public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  source text check (char_length(source) <= 40),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  listened_ms integer not null default 0 check (listened_ms >= 0),
  is_valid boolean not null default false,
  counted boolean not null default false,
  completed boolean not null default false,
  validated_at timestamptz
);
create index play_sessions_user_started_idx on public.play_sessions (user_id, started_at desc);
create index play_sessions_track_valid_idx on public.play_sessions (track_id, validated_at desc) where is_valid;
create index play_sessions_started_idx on public.play_sessions (started_at desc);

alter table public.play_sessions enable row level security;
create policy "play_sessions: propias" on public.play_sessions for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.play_sessions from anon, authenticated;
grant select on public.play_sessions to authenticated;

create table public.play_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.play_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  event_type text not null check (event_type in ('start', 'valid', 'complete')),
  position_ms integer check (position_ms >= 0),
  created_at timestamptz not null default now()
);
create index play_events_created_idx on public.play_events (created_at desc);
create index play_events_track_type_idx on public.play_events (track_id, event_type, created_at desc);
alter table public.play_events enable row level security;
create policy "play_events: propios" on public.play_events for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.play_events from anon, authenticated;
grant select on public.play_events to authenticated;

create table public.listening_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  session_id uuid references public.play_sessions (id) on delete set null,
  context_type text check (context_type in ('playlist', 'album', 'artist', 'search', 'home', 'library', 'track', 'profile', 'queue')),
  context_id text check (char_length(context_id) <= 64),
  played_at timestamptz not null default now()
);
create index listening_history_user_idx on public.listening_history (user_id, played_at desc);
alter table public.listening_history enable row level security;
create policy "listening_history: propio" on public.listening_history for select to authenticated using (user_id = (select auth.uid()));
create policy "listening_history: borrar propio" on public.listening_history for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.listening_history from anon, authenticated;
grant select, delete on public.listening_history to authenticated;

-- ---------------------------------------------------------------- notificaciones
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('new_follower', 'new_comment', 'track_published', 'track_rejected', 'track_removed', 'report_resolved', 'system')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "notifications: propias" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: marcar como leídas" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: borrar propias" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify(p_user uuid, p_type text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, payload) values (p_user, p_type, coalesce(p_payload, '{}'::jsonb));
$$;

create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(new.followee_id, 'new_follower', jsonb_build_object('follower_id', new.follower_id));
  return null;
end;
$$;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_new_follower();

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.tracks where id = new.track_id;
  if owner is not null and owner <> new.user_id then
    perform public.notify(owner, 'new_comment', jsonb_build_object('track_id', new.track_id, 'comment_id', new.id, 'user_id', new.user_id));
  end if;
  return null;
end;
$$;
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_new_comment();

-- ---------------------------------------------------------------- denuncias de usuarios
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolution_note text check (char_length(resolution_note) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
create index reports_target_idx on public.reports (target_type, target_id);
create unique index reports_one_open_per_user_target on public.reports (reporter_id, target_type, target_id) where status in ('open', 'reviewing');
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;
create policy "reports: propias o moderación" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());
create policy "reports: denunciar" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (target_type, target_id, reason, details, reporter_id) on public.reports to authenticated;

create or replace function public.reports_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'ordyx:rate_limited';
  end if;
  return new;
end;
$$;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.reports_rate_limit();

-- ---------------------------------------------------------------- reclamaciones de derechos (también sin cuenta)
create table public.rights_claims (
  id uuid primary key default gen_random_uuid(),
  claimant_name text not null check (char_length(claimant_name) between 2 and 200),
  claimant_email text not null check (claimant_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(claimant_email) <= 254),
  content_url text not null check (char_length(content_url) between 5 and 500),
  track_id uuid references public.tracks (id) on delete set null,
  original_work text not null check (char_length(original_work) between 3 and 1000),
  details text not null check (char_length(details) between 10 and 5000),
  good_faith_statement boolean not null check (good_faith_statement),
  status public.report_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rights_claims_status_idx on public.rights_claims (status, created_at);
create trigger rights_claims_updated_at before update on public.rights_claims
  for each row execute function public.set_updated_at();
alter table public.rights_claims enable row level security;
create policy "rights_claims: moderación" on public.rights_claims for select to authenticated using (public.is_moderator());
revoke all on public.rights_claims from anon, authenticated;
grant select on public.rights_claims to authenticated;
-- Alta exclusivamente mediante `public.submit_rights_claim` (valida y limita la frecuencia).

-- ---------------------------------------------------------------- errores de cliente (diagnóstico)
create table public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  app text not null check (app in ('mobile', 'web', 'admin')),
  app_version text check (char_length(app_version) <= 30),
  platform text check (char_length(platform) <= 30),
  message text not null check (char_length(message) <= 1000),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index client_errors_created_idx on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;
create policy "client_errors: solo administración" on public.client_errors for select to authenticated using (public.is_admin());
revoke all on public.client_errors from anon, authenticated;
grant select on public.client_errors to authenticated;
