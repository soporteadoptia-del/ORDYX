-- =====================================================================================
-- Ordyx · 0001 · Extensiones, tipos, utilidades y roles
-- Convenciones:
--   * Todas las tablas expuestas tienen RLS activado y permisos (GRANT) explícitos.
--   * Las funciones SECURITY DEFINER fijan `search_path = ''` y usan nombres cualificados.
--   * Los errores de negocio se lanzan como `ordyx:<codigo>` para traducirlos en el cliente.
-- =====================================================================================

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------- tipos enumerados
create type public.app_role as enum ('artist', 'moderator', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.track_status as enum ('draft', 'processing', 'pending_review', 'published', 'rejected', 'removed');
create type public.album_status as enum ('draft', 'published', 'removed');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_target as enum ('track', 'comment', 'profile', 'playlist', 'artist', 'album');
create type public.report_reason as enum ('copyright', 'spam', 'abuse', 'illegal', 'impersonation', 'other');
create type public.app_platform as enum ('android', 'ios');
create type public.release_channel as enum ('stable', 'beta');
create type public.release_status as enum ('draft', 'published', 'withdrawn');
create type public.install_method as enum ('apk', 'play_store', 'testflight', 'app_store', 'web_distribution');

-- ---------------------------------------------------------------- utilidades
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- `unaccent` no es IMMUTABLE; este envoltorio con diccionario explícito sí puede usarse en índices y columnas generadas.
create or replace function public.normalize_search(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(input, '')));
$$;

-- ---------------------------------------------------------------- roles de aplicación
-- Los roles NO viven en `profiles` para que ningún usuario pueda modificarlos actualizando su perfil.
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = check_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role in ('admin', 'moderator')
  );
$$;

create policy "user_roles: cada usuario ve sus roles; staff ve todos"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator());
-- Sin políticas de INSERT/UPDATE/DELETE: solo las funciones admin_* (SECURITY DEFINER) modifican roles.

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

-- ---------------------------------------------------------------- auditoría administrativa
create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);

alter table public.admin_audit_logs enable row level security;
create policy "audit: solo administradores leen"
  on public.admin_audit_logs for select
  to authenticated
  using (public.is_admin());
revoke all on public.admin_audit_logs from anon, authenticated;
grant select on public.admin_audit_logs to authenticated;

create or replace function public.write_audit_log(p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;
