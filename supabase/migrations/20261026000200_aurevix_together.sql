-- Música en compañía (como Spotify):
-- 1. Listas colaborativas: quien tiene el enlace de una lista colaborativa puede unirse y añadir o
--    quitar canciones. Solo la persona propietaria cambia el nombre, la portada o la privacidad.
-- 2. Mensajes directos entre personas, con la opción de compartir una canción o una lista.
-- 3. Fusión («Blend»): una lista que mezcla lo que escucháis dos personas que os seguís mutuamente.

-- ---------------------------------------------------------------- listas colaborativas
grant update (is_collaborative) on public.playlists to authenticated;

create table public.playlist_members (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (playlist_id, user_id)
);
create index playlist_members_user_idx on public.playlist_members (user_id);

create or replace function private.is_playlist_member(p_playlist uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.playlist_members m
    join public.playlists p on p.id = m.playlist_id and p.is_collaborative
    where m.playlist_id = p_playlist and m.user_id = (select auth.uid())
  );
$$;
revoke execute on function private.is_playlist_member(uuid) from public, anon;
grant execute on function private.is_playlist_member(uuid) to authenticated;

alter table public.playlist_members enable row level security;
create policy "playlist_members: miembros y propietaria" on public.playlist_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_playlist_member(playlist_id)
    or exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid()))
  );
create policy "playlist_members: salir o expulsar" on public.playlist_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid()))
  );
revoke all on public.playlist_members from anon, authenticated;
grant select, delete on public.playlist_members to authenticated;

create policy "playlists: colaborativas para sus miembros" on public.playlists for select to authenticated
  using (is_collaborative and private.is_playlist_member(id));
create policy "playlist_tracks: añadir en colaborativas" on public.playlist_tracks for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and private.is_active_user()
    and private.is_playlist_member(playlist_id)
    and exists (select 1 from public.tracks t where t.id = track_id and t.status = 'published')
  );
create policy "playlist_tracks: quitar en colaborativas" on public.playlist_tracks for delete to authenticated
  using (private.is_playlist_member(playlist_id));

-- Unirse con el enlace (el id de la lista no se puede adivinar).
create or replace function public.join_playlist(p_playlist uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if (select auth.uid()) is null or not private.is_active_user() then
    raise exception 'ordyx:not_allowed';
  end if;
  select owner_id into v_owner from public.playlists where id = p_playlist and is_collaborative;
  if v_owner is null then raise exception 'ordyx:not_found'; end if;
  if v_owner = (select auth.uid()) then return; end if;
  if private.is_blocked_between(v_owner, (select auth.uid())) then raise exception 'ordyx:not_allowed'; end if;
  insert into public.playlist_members (playlist_id, user_id) values (p_playlist, (select auth.uid()))
  on conflict do nothing;
end;
$$;
revoke execute on function public.join_playlist(uuid) from public, anon;
grant execute on function public.join_playlist(uuid) to authenticated;

-- Listas colaborativas en las que participo (además de las mías).
create or replace function public.my_collab_playlists()
returns setof public.playlists
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from public.playlists p
  join public.playlist_members m on m.playlist_id = p.id
  where m.user_id = (select auth.uid()) and p.is_collaborative
  order by p.updated_at desc;
$$;
revoke execute on function public.my_collab_playlists() from public, anon;
grant execute on function public.my_collab_playlists() to authenticated;

-- ---------------------------------------------------------------- mensajes
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text check (char_length(body) <= 1000),
  track_id uuid references public.tracks (id) on delete set null,
  playlist_id uuid references public.playlists (id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id),
  check (coalesce(char_length(trim(body)), 0) > 0 or track_id is not null or playlist_id is not null)
);
create index messages_pair_idx on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index messages_recipient_unread_idx on public.messages (recipient_id) where read_at is null;

alter table public.messages enable row level security;
create policy "messages: los de la conversación" on public.messages for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "messages: enviar" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_active_user()
    and not private.is_blocked_between(sender_id, recipient_id)
    and exists (select 1 from public.profiles p where p.id = recipient_id and p.status = 'active')
  );
create policy "messages: marcar como leído" on public.messages for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
create policy "messages: borrar los propios" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));
revoke all on public.messages from anon, authenticated;
grant select, delete on public.messages to authenticated;
grant insert (recipient_id, body, track_id, playlist_id) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

-- Límite: 30 mensajes por minuto por persona.
create or replace function private.messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'ordyx:rate_limited';
  end if;
  return new;
end;
$$;
create trigger messages_rate_limit before insert on public.messages
  for each row execute function private.messages_rate_limit();

-- Conversaciones: último mensaje con cada persona y cuántos no he leído.
create or replace function public.my_conversations()
returns table (
  other_id uuid,
  username text,
  display_name text,
  avatar_path text,
  last_body text,
  last_kind text,
  last_at timestamptz,
  last_from_me boolean,
  unread integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  mine as (
    select m.*, case when m.sender_id = (select id from me) then m.recipient_id else m.sender_id end as other
    from public.messages m
    where (select id from me) in (m.sender_id, m.recipient_id)
  ),
  last as (
    select distinct on (other) other, body, track_id, playlist_id, created_at, sender_id
    from mine order by other, created_at desc
  )
  select l.other, p.username::text, p.display_name, p.avatar_path,
    l.body,
    case when l.track_id is not null then 'track' when l.playlist_id is not null then 'playlist' else 'text' end,
    l.created_at,
    l.sender_id = (select id from me),
    (select count(*)::integer from mine x where x.other = l.other and x.recipient_id = (select id from me) and x.read_at is null)
  from last l join public.profiles p on p.id = l.other
  order by l.created_at desc;
$$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- ---------------------------------------------------------------- Fusión
-- Mezcla lo que más escucháis (90 días) y vuestros favoritos. Solo entre personas que se siguen
-- mutuamente, para no revelar los gustos de nadie a desconocidos.
create or replace function public.blend_with(p_user uuid, p_limit integer default 50)
returns table (track_id uuid, from_user uuid, score numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null or p_user is null or p_user = v_me then raise exception 'ordyx:invalid_input'; end if;
  if not (
    exists (select 1 from public.follows where follower_id = v_me and followee_id = p_user)
    and exists (select 1 from public.follows where follower_id = p_user and followee_id = v_me)
  ) then
    raise exception 'ordyx:blend_requires_mutual';
  end if;
  if private.is_blocked_between(v_me, p_user) then raise exception 'ordyx:not_allowed'; end if;
  return query
  with taste as (
    select s.user_id as u, s.track_id as t, sum(s.listened_ms)::numeric / 60000 as w
    from public.play_sessions s
    where s.user_id in (v_me, p_user) and s.started_at > now() - interval '90 days'
    group by s.user_id, s.track_id
    union all
    select l.user_id, l.track_id, 5 from public.likes l where l.user_id in (v_me, p_user)
  ),
  agg as (
    select t, u, sum(w) as w from taste group by t, u
  ),
  ranked as (
    select a.t, a.u,
      -- Las canciones que os gustan a los dos suben arriba.
      a.w + case when exists (select 1 from agg b where b.t = a.t and b.u <> a.u) then 100 else 0 end as w,
      row_number() over (partition by a.u order by a.w desc) as rn
    from agg a
  )
  select distinct on (r.t) r.t, r.u, r.w
  from ranked r
  join public.tracks tr on tr.id = r.t and tr.status = 'published'
  order by r.t, r.w desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;
revoke execute on function public.blend_with(uuid, integer) from public, anon;
grant execute on function public.blend_with(uuid, integer) to authenticated;
