-- Aurevix Music: inicio de sesión con Google y Apple, y nombre/correo definitivos de la plataforma.

-- ---------------------------------------------------------------- alta de usuarios OAuth
-- Google envía `full_name`/`name` en los metadatos y Apple, como mucho, `full_name` la primera vez.
-- Ninguno envía `username`, así que se propone uno a partir del correo (p. ej. «aurevixweb»).
-- Los usuarios OAuth no pasan por el formulario de registro: aceptan las condiciones dentro de la
-- app con `accept_terms()` (los clientes lo piden si `terms_accepted_at` es null).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested text := lower(trim(coalesce(meta ->> 'username', '')));
  final_username text;
  shown_name text := nullif(left(trim(coalesce(
    meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name', '')), 60), '');
  accepted boolean := coalesce((meta ->> 'accept_terms')::boolean, false);
begin
  if requested = '' and new.email is not null then
    requested := left(trim(both '._' from regexp_replace(
      lower(split_part(new.email, '@', 1)), '[^a-z0-9_.]+', '_', 'g')), 30);
  end if;

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
  values (new.id, final_username, shown_name);

  insert into public.user_settings (user_id, terms_accepted_at, privacy_accepted_at)
  values (new.id, case when accepted then now() end, case when accepted then now() end);

  return new;
end;
$$;

-- Aceptación de condiciones y privacidad por el propio usuario (idempotente: conserva la fecha original).
create or replace function public.accept_terms()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_settings
     set terms_accepted_at = coalesce(terms_accepted_at, now()),
         privacy_accepted_at = coalesce(privacy_accepted_at, now())
   where user_id = (select auth.uid());
$$;
revoke execute on function public.accept_terms() from public, anon;
grant execute on function public.accept_terms() to authenticated;

-- ---------------------------------------------------------------- marca
update public.app_config set value = '"Aurevix Music"', description = 'Nombre visible de la plataforma.'
 where key = 'platform_name';
update public.app_config set value = '"aurevixweb@gmail.com"'
 where key = 'support_email';
