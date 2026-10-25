-- Altas por Google/Apple y aceptación de condiciones dentro de la app (tras 10_security.sql).
\set QUIET on
set client_min_messages = notice;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'Aurevix.Web@gmail.com', '{"full_name":"Aurevix Web","avatar_url":"https://example.com/a.png"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'alice@otro.dev', '{"name":"Otra Alice"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'ab@privaterelay.appleid.com', '{}');

select tests.expect_true(
  (select username::text = 'aurevix.web' and display_name = 'Aurevix Web' from public.profiles where id = '00000000-0000-0000-0000-0000000000f1'),
  'Google: el nombre de usuario sale del correo y el nombre visible de full_name');
select tests.expect_true(
  (select username::text like 'user\_%' and display_name = 'Otra Alice' from public.profiles where id = '00000000-0000-0000-0000-0000000000f2'),
  'si el nombre del correo ya existe se genera uno provisional; name se usa como nombre visible');
select tests.expect_true(
  (select username::text like 'user\_%' and display_name is null from public.profiles where id = '00000000-0000-0000-0000-0000000000f3'),
  'Apple sin nombre y con correo corto: usuario provisional');
select tests.expect_true(
  (select terms_accepted_at is null from public.user_settings where user_id = '00000000-0000-0000-0000-0000000000f1'),
  'los usuarios OAuth empiezan sin condiciones aceptadas');

select tests.expect_true(not has_function_privilege('anon', 'public.accept_terms()', 'execute'), 'anon no puede aceptar condiciones');
select tests.login('00000000-0000-0000-0000-0000000000f1');
select public.accept_terms();
select tests.logout();
select tests.expect_true(
  (select terms_accepted_at is not null and privacy_accepted_at is not null from public.user_settings where user_id = '00000000-0000-0000-0000-0000000000f1'),
  'accept_terms registra la aceptación del propio usuario');
select tests.expect_true(
  (select terms_accepted_at is null from public.user_settings where user_id = '00000000-0000-0000-0000-0000000000f2'),
  'accept_terms no toca a otros usuarios');
select tests.expect_true(
  (select value = '"Aurevix Music"'::jsonb from public.app_config where key = 'platform_name'),
  'la plataforma se llama Aurevix Music');
\echo '✔ Pruebas de OAuth superadas'
