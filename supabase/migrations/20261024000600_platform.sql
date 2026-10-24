-- =====================================================================================
-- Ordyx · 0006 · Versiones de la app y configuración pública de la plataforma
-- =====================================================================================

create table public.app_versions (
  id uuid primary key default gen_random_uuid(),
  platform public.app_platform not null,
  channel public.release_channel not null default 'stable',
  version text not null check (version ~ '^\d+\.\d+\.\d+$'),
  build_number integer not null check (build_number > 0),
  status public.release_status not null default 'draft',
  install_method public.install_method not null,
  release_notes text check (char_length(release_notes) <= 5000),
  min_os_version text check (char_length(min_os_version) <= 20),
  -- URL HTTPS de descarga (APK) o de instalación (TestFlight, App Store, Play Store, Web Distribution).
  download_url text check (download_url ~ '^https://'),
  -- Alternativa: ruta del binario en el bucket `releases`.
  storage_path text check (char_length(storage_path) <= 300),
  file_size_bytes bigint check (file_size_bytes > 0),
  sha256 text check (sha256 ~ '^[a-f0-9]{64}$'),
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, channel, version, build_number),
  constraint app_versions_method_platform check (
    (platform = 'android' and install_method in ('apk', 'play_store'))
    or (platform = 'ios' and install_method in ('testflight', 'app_store', 'web_distribution'))
  ),
  constraint app_versions_has_target check (download_url is not null or storage_path is not null),
  constraint app_versions_apk_verifiable check (install_method <> 'apk' or (sha256 is not null and file_size_bytes is not null)),
  -- Nunca se publica una versión no verificada.
  constraint app_versions_published_verified check (status <> 'published' or (verified_at is not null and published_at is not null))
);
create index app_versions_lookup_idx on public.app_versions (platform, channel, status, published_at desc);
create trigger app_versions_updated_at before update on public.app_versions
  for each row execute function public.set_updated_at();

alter table public.app_versions enable row level security;
create policy "app_versions: publicadas o administración" on public.app_versions for select to anon, authenticated
  using (status = 'published' or public.is_admin());
revoke all on public.app_versions from anon, authenticated;
grant select on public.app_versions to anon, authenticated;
-- Escritura únicamente mediante funciones admin_* con registro de auditoría.

-- Versión vigente por plataforma y canal (la publicada más reciente).
create or replace view public.current_app_versions
with (security_invoker = true)
as
select distinct on (platform, channel) *
from public.app_versions
where status = 'published'
order by platform, channel, published_at desc, build_number desc;
grant select on public.current_app_versions to anon, authenticated;

-- ---------------------------------------------------------------- configuración
create table public.app_config (
  key text primary key check (key ~ '^[a-z0-9_.]{2,60}$'),
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger app_config_updated_at before update on public.app_config
  for each row execute function public.set_updated_at();
alter table public.app_config enable row level security;
create policy "app_config: públicas o administración" on public.app_config for select to anon, authenticated
  using (is_public or public.is_admin());
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;

insert into public.app_config (key, value, is_public, description) values
  ('platform_name', '"Ordyx"', true, 'Nombre visible de la plataforma (provisional).'),
  ('support_email', '"soporte@ordyx.app"', true, 'Correo de soporte mostrado en la web y en la app.'),
  ('social_links', '{}', true, 'Enlaces a redes sociales: {"instagram": "https://...", ...}'),
  ('min_supported_version', '{"android": "1.0.0", "ios": "1.0.0"}', true, 'Versión mínima del binario; las inferiores muestran aviso de actualización.'),
  ('maintenance_message', 'null', true, 'Mensaje opcional de mantenimiento mostrado en los clientes.'),
  ('auto_publish_verified_artists', 'false', false, 'Si es true, las canciones de artistas verificados se publican sin revisión manual.'),
  ('transcoding_enabled', 'false', false, 'Si es true, las canciones pasan a "processing" hasta que el worker de transcodificación termine.');
