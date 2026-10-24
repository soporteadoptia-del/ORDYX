-- =====================================================================================
-- Ordyx · 0002 · Perfiles, ajustes, bloqueos y seguidores
-- =====================================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique
    check (char_length(username::text) between 3 and 30
           and username::text ~ '^[a-z0-9_.]+$'
           and username::text !~ '^\.|\.$'),
  display_name text check (char_length(display_name) <= 60),
  avatar_path text check (char_length(avatar_path) <= 300),
  bio text check (char_length(bio) <= 500),
  status public.account_status not null default 'active',
  suspended_reason text,
  follower_count integer not null default 0 check (follower_count >= 0),
  following_count integer not null default 0 check (following_count >= 0),
  search_text text generated always as (public.normalize_search(username::text || ' ' || coalesce(display_name, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_search_trgm on public.profiles using gin (search_text extensions.gin_trgm_ops);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active'
  );
$$;

alter table public.profiles enable row level security;

create policy "profiles: lectura pública"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles: cada usuario edita el suyo"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (avatar_path is null or avatar_path like (select auth.uid())::text || '/%')
  );

-- Permisos a nivel de columna: el usuario NO puede tocar status, contadores ni fechas.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_path, bio) on public.profiles to authenticated;

-- ---------------------------------------------------------------- ajustes de usuario
create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  show_likes_public boolean not null default false,
  show_history_public boolean not null default false,
  allow_explicit boolean not null default true,
  email_notifications boolean not null default true,
  marketing_consent boolean not null default false,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
create policy "user_settings: propio (lectura)"
  on public.user_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "user_settings: propio (edición)"
  on public.user_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.user_settings from anon, authenticated;
grant select on public.user_settings to authenticated;
grant update (show_likes_public, show_history_public, allow_explicit, email_notifications, marketing_consent)
  on public.user_settings to authenticated;

-- ---------------------------------------------------------------- alta automática de perfil
-- Se ejecuta al crear el usuario en auth.users. El nombre de usuario solicitado se valida y,
-- si no es válido o ya existe, se genera uno provisional que el usuario podrá cambiar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  final_username text;
  accepted boolean := coalesce((new.raw_user_meta_data ->> 'accept_terms')::boolean, false);
begin
  if requested ~ '^[a-z0-9_.]{3,30}$' and requested !~ '^\.|\.$'
     and not exists (select 1 from public.profiles where username = requested::extensions.citext) then
    final_username := requested;
  else
    loop
      final_username := 'user_' || substr(md5(new.id::text || clock_timestamp()::text || random()::text), 1, 10);
      exit when not exists (select 1 from public.profiles where username = final_username::extensions.citext);
    end loop;
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60), ''));

  insert into public.user_settings (user_id, terms_accepted_at, privacy_accepted_at)
  values (new.id, case when accepted then now() end, case when accepted then now() end);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- bloqueos
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;
create policy "blocks: propios (lectura)" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "blocks: crear propios" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "blocks: borrar propios" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- ---------------------------------------------------------------- seguidores (usuario → usuario)
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, created_at desc);

alter table public.follows enable row level security;
create policy "follows: lectura pública" on public.follows for select to anon, authenticated using (true);
create policy "follows: seguir" on public.follows for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and public.is_active_user()
    and not public.is_blocked_between(follower_id, followee_id)
  );
create policy "follows: dejar de seguir" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));
revoke all on public.follows from anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- Al bloquear, se eliminan los seguimientos en ambos sentidos.
create or replace function public.on_block_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;
create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.on_block_created();

create or replace function public.on_follow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.followee_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    -- límite anti-abuso: 200 nuevos seguimientos por hora
    if (select count(*) from public.follows where follower_id = new.follower_id and created_at > now() - interval '1 hour') > 200 then
      raise exception 'ordyx:rate_limited';
    end if;
    return new;
  else
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.followee_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    return old;
  end if;
end;
$$;
create trigger follows_counters after insert or delete on public.follows
  for each row execute function public.on_follow_change();
