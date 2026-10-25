-- =====================================================================================
-- Ordyx · 0010 · Privilegios de service_role y alta de perfiles para usuarios preexistentes
-- Los proyectos nuevos de Supabase no conceden privilegios por defecto sobre tablas nuevas:
-- service_role (Edge Functions, scripts de administración) los recibe aquí explícitamente.
-- service_role NUNCA se usa en clientes (app móvil, web pública ni panel en el navegador).
-- =====================================================================================
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Usuarios que ya existían en auth.users antes de instalar Ordyx: se les crea perfil y ajustes.
insert into public.profiles (id, username)
select u.id, 'user_' || substr(md5(u.id::text || clock_timestamp()::text), 1, 10)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.user_settings (user_id)
select p.id from public.profiles p
where not exists (select 1 from public.user_settings s where s.user_id = p.id);
