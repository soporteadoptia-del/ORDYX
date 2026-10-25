-- =====================================================================================
-- Pruebas de seguridad (RLS, permisos de columna, RPC) y de reglas de negocio.
-- Se ejecutan como los roles reales de la API (anon / authenticated) con distintos usuarios.
-- Cualquier fallo aborta con "FALLO: ...".
-- =====================================================================================
\set QUIET on
set client_min_messages = warning;

create schema tests;
grant usage on schema tests to public;

create function tests.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
  if p_user is null then
    execute 'set role anon';
  else
    execute 'set role authenticated';
  end if;
end $$;

create function tests.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

create function tests.expect_error(p_sql text, p_label text, p_pattern text default null) returns void language plpgsql as $$
declare
  failed boolean := false;
  msg text;
begin
  begin
    execute p_sql;
  exception when others then
    failed := true;
    msg := sqlerrm;
  end;
  if not failed then
    raise exception 'FALLO (se esperaba error): %', p_label;
  end if;
  if p_pattern is not null and msg !~* p_pattern then
    raise exception 'FALLO (error inesperado "%"): %', msg, p_label;
  end if;
  raise notice 'ok  %', p_label;
end $$;

create function tests.expect_count(p_sql text, p_expected bigint, p_label text) returns void language plpgsql as $$
declare
  n bigint;
begin
  execute 'select count(*) from (' || p_sql || ') q' into n;
  if n <> p_expected then
    raise exception 'FALLO (esperado %, obtenido %): %', p_expected, n, p_label;
  end if;
  raise notice 'ok  %', p_label;
end $$;

create function tests.expect_true(p_cond boolean, p_label text) returns void language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'FALLO: %', p_label;
  end if;
  raise notice 'ok  %', p_label;
end $$;

grant execute on all functions in schema tests to public;
create table tests.ids (name text primary key, id uuid);
grant all on tests.ids to public;
create function tests.id(p_name text) returns uuid language sql stable as $$ select id from tests.ids where name = p_name $$;
grant execute on function tests.id(text) to public;

set client_min_messages = notice;

-- ---------------------------------------------------------------- alta de usuarios
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.dev', '{"username":"alice","accept_terms":true}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.dev', '{"username":"bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'root@test.dev', '{"username":"root"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@test.dev', '{"username":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@test.dev', '{"username":"x y"}');
insert into tests.ids values
  ('alice', '00000000-0000-0000-0000-00000000000a'),
  ('bob', '00000000-0000-0000-0000-00000000000b'),
  ('root', '00000000-0000-0000-0000-00000000000c'),
  ('dave', '00000000-0000-0000-0000-00000000000d'),
  ('eve', '00000000-0000-0000-0000-00000000000e');

select tests.expect_count('select 1 from public.profiles', 5, 'se crea un perfil por usuario registrado');
select tests.expect_true((select username::text from public.profiles where id = tests.id('dave')) like 'user\_%', 'nombre de usuario duplicado (sin distinguir mayúsculas) → nombre provisional');
select tests.expect_true((select username::text from public.profiles where id = tests.id('eve')) like 'user\_%', 'nombre de usuario inválido → nombre provisional');
select tests.expect_true((select terms_accepted_at is not null from public.user_settings where user_id = tests.id('alice')), 'se registra la aceptación de condiciones');

-- ---------------------------------------------------------------- perfiles y roles
select tests.login(tests.id('alice'));
update public.profiles set display_name = 'Alice A.' where id = tests.id('alice');
select tests.expect_true((select display_name = 'Alice A.' from public.profiles where id = tests.id('alice')), 'un usuario edita su propio perfil');
update public.profiles set display_name = 'hackeado' where id = tests.id('bob');
select tests.expect_true((select display_name is null from public.profiles where id = tests.id('bob')), 'un usuario NO puede editar perfiles ajenos');
select tests.expect_error($$update public.profiles set status = 'active' where id = tests.id('alice')$$, 'un usuario NO puede cambiar su estado de cuenta', 'permission denied');
select tests.expect_error($$update public.profiles set follower_count = 9999 where id = tests.id('alice')$$, 'un usuario NO puede alterar contadores', 'permission denied');
select tests.expect_error($$update public.profiles set username = 'no valido!' where id = tests.id('alice')$$, 'el servidor valida el formato del nombre de usuario', 'check');
select tests.expect_error($$update public.profiles set avatar_path = '00000000-0000-0000-0000-00000000000b/a.png' where id = tests.id('alice')$$, 'el avatar debe estar en la carpeta propia');
select tests.expect_error($$insert into public.user_roles (user_id, role) values (tests.id('alice'), 'admin')$$, 'un usuario NO puede concederse el rol admin', 'permission denied');
select tests.expect_error($$select public.bootstrap_first_admin('alice@test.dev')$$, 'un usuario NO puede ejecutar bootstrap_first_admin', 'permission denied');
select tests.expect_error($$select public.admin_set_role(tests.id('alice'), 'admin', true)$$, 'un usuario NO puede usar funciones admin', 'ordyx:not_allowed');
select tests.expect_error($$select * from public.admin_list_users()$$, 'un usuario NO puede listar usuarios/correos', 'ordyx:not_allowed');
select tests.expect_count('select 1 from public.user_settings', 1, 'cada usuario solo ve sus propios ajustes');
select tests.logout();

select public.bootstrap_first_admin('root@test.dev');
select tests.expect_error($$select public.bootstrap_first_admin('bob@test.dev')$$, 'bootstrap_first_admin solo funciona una vez', 'ordyx:admin_exists');

select tests.login(tests.id('root'));
select tests.expect_count('select * from public.admin_list_users()', 5, 'el administrador puede listar usuarios');
select tests.expect_error($$select public.admin_set_role(tests.id('root'), 'admin', false)$$, 'un admin no puede retirarse su propio rol (evita quedarse sin administradores)');
select tests.logout();

-- ---------------------------------------------------------------- artistas y subida de música
select tests.login(tests.id('alice'));
select tests.expect_error($$insert into public.artists (slug, name, created_by) values ('alice-band', 'Alice Band', tests.id('alice'))$$, 'sin Premium no se puede crear un artista');
select tests.logout();

select tests.login(tests.id('root'));
select public.admin_set_role(tests.id('alice'), 'artist', true);
-- Publicar exige Premium (ver 20261025000400_aurevix_premium.sql).
select public.admin_grant_plus(tests.id('alice'), 12, 'Pruebas');
select tests.logout();
select tests.expect_count($$select 1 from public.admin_audit_logs where action = 'role.grant'$$, 1, 'la concesión de rol queda auditada');

select tests.login(tests.id('alice'));
insert into public.artists (slug, name, created_by) values ('alice-band', 'Alice Band', tests.id('alice'));
insert into tests.ids select 'artist', id from public.artists where slug = 'alice-band';
select tests.expect_true(private.is_artist_member(tests.id('artist')), 'quien crea el artista queda como propietario');
select tests.expect_error($$update public.artists set is_verified = true where id = tests.id('artist')$$, 'un artista NO puede verificarse a sí mismo', 'permission denied');

insert into public.tracks (id, artist_id, title, genre_id, license, rights_holder, duration_ms, audio_path)
values ('10000000-0000-0000-0000-000000000001', tests.id('artist'), 'Canción de prueba', 1, 'all-rights-reserved', 'Alice', 180000,
        '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000001/original.mp3');
insert into tests.ids values ('track', '10000000-0000-0000-0000-000000000001');
select tests.expect_error($$insert into public.tracks (artist_id, title, status) values (tests.id('artist'), 'x', 'published')$$, 'no se puede crear una canción ya publicada', 'permission denied');
select tests.expect_error($$update public.tracks set status = 'published' where id = tests.id('track')$$, 'el propietario NO puede autopublicarse', 'permission denied');
select tests.expect_error($$update public.tracks set play_count = 1000000 where id = tests.id('track')$$, 'el propietario NO puede inflar reproducciones', 'permission denied');
select tests.expect_error($$update public.tracks set audio_path = '00000000-0000-0000-0000-00000000000b/x/original.mp3' where id = tests.id('track')$$, 'no se puede apuntar al audio de otro usuario');
select tests.expect_error($$select public.submit_track(tests.id('track'), true)$$, 'no se puede enviar a revisión sin archivo en Storage', 'ordyx:audio_missing');
insert into storage.objects (bucket_id, name, owner, metadata)
values ('audio', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000001/original.mp3', tests.id('alice'),
        '{"size": 4200000, "mimetype": "audio/mpeg"}');
select tests.expect_error($$select public.submit_track(tests.id('track'), false)$$, 'hay que confirmar los derechos', 'ordyx:rights_required');
select tests.expect_true(public.submit_track(tests.id('track'), true) = 'pending_review', 'la canción pasa a revisión');
select tests.expect_true((select audio_size_bytes = 4200000 from public.tracks where id = tests.id('track')), 'el tamaño se toma de Storage, no del cliente');
select tests.expect_error($$update public.tracks set audio_path = '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000001/otro.mp3' where id = tests.id('track')$$, 'el audio no puede cambiarse fuera de borrador', 'ordyx:invalid_state');
select tests.logout();

select tests.login(tests.id('bob'));
select tests.expect_count('select 1 from public.tracks', 0, 'otros usuarios NO ven canciones pendientes');
select tests.expect_count($$select 1 from storage.objects where bucket_id = 'audio'$$, 0, 'otros usuarios NO pueden obtener el audio de canciones no publicadas');
select tests.expect_error($$insert into storage.objects (bucket_id, name) values ('audio', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000001/x.mp3')$$, 'nadie sube a la carpeta de otro usuario', 'row-level security');
select tests.expect_error($$insert into storage.objects (bucket_id, name) values ('audio', '00000000-0000-0000-0000-00000000000b/10000000-0000-0000-0000-000000000001/original.mp3')$$, 'sin rol de artista no se sube audio', 'row-level security');
select tests.expect_error($$insert into public.likes (user_id, track_id) values (tests.id('bob'), tests.id('track'))$$, 'no se puede dar me gusta a una canción no publicada');
update public.tracks set title = 'robada' where id = tests.id('track');
delete from public.tracks where id = tests.id('track');
select tests.expect_error($$select public.admin_review_track(tests.id('track'), 'publish')$$, 'un usuario normal no puede moderar', 'ordyx:not_allowed');
select tests.logout();
select tests.expect_true((select title = 'Canción de prueba' from public.tracks where id = tests.id('track')), 'otros usuarios NO pueden editar ni borrar canciones ajenas');

select tests.login(null);
select tests.expect_count('select 1 from public.tracks', 0, 'anónimos NO ven canciones pendientes');
select tests.logout();

select tests.login(tests.id('root'));
select tests.expect_count($$select 1 from public.tracks where status = 'pending_review'$$, 1, 'moderación ve la cola de revisión');
select public.admin_review_track(tests.id('track'), 'publish', 'OK');
select tests.logout();
select tests.expect_count($$select 1 from public.notifications where user_id = tests.id('alice') and type = 'track_published'$$, 1, 'el artista recibe la notificación de publicación');

select tests.login(null);
select tests.expect_count('select 1 from public.tracks', 1, 'anónimos ven canciones publicadas (catálogo público)');
select tests.expect_count($$select 1 from storage.objects where bucket_id = 'audio'$$, 0, 'anónimos NO pueden obtener URLs de audio');
select tests.expect_count($$select * from public.search_catalog('cancion')$$, 1, 'la búsqueda ignora tildes y encuentra la canción publicada');
select tests.expect_count($$select * from public.search_catalog('alice band', 'track')$$, 1, 'la búsqueda encuentra canciones por nombre de artista');
select tests.expect_count($$select * from public.search_catalog('alice', 'artist')$$, 1, 'la búsqueda filtra por tipo');
select tests.expect_error($$select public.start_play(tests.id('track'))$$, 'los anónimos no registran reproducciones', 'permission denied');
select tests.logout();

-- ---------------------------------------------------------------- reproducción y estadísticas
select tests.login(tests.id('bob'));
select tests.expect_count($$select 1 from storage.objects where bucket_id = 'audio'$$, 1, 'usuarios con sesión pueden firmar el audio de canciones publicadas');
insert into tests.ids values ('s1', public.start_play(tests.id('track'), 'test', 'track', null));
select tests.expect_true((public.report_play_progress(tests.id('s1'), 60000) ->> 'is_valid')::boolean = false, 'no se aceptan más segundos escuchados que el tiempo real transcurrido');
select tests.logout();
update public.play_sessions set started_at = now() - interval '45 seconds' where id = tests.id('s1');
select tests.login(tests.id('bob'));
select tests.expect_true((public.report_play_progress(tests.id('s1'), 40000) ->> 'counted')::boolean, 'tras 30 s reales la reproducción es válida y cuenta');
select tests.expect_true((public.report_play_progress(tests.id('s1'), 50000) ->> 'counted')::boolean, 'informes repetidos de la misma sesión son idempotentes');
insert into tests.ids values ('s2', public.start_play(tests.id('track'), 'test', 'track', null));
select tests.logout();
update public.play_sessions set started_at = now() - interval '3 minutes' where id = tests.id('s2');
select tests.login(tests.id('bob'));
select tests.expect_true((public.report_play_progress(tests.id('s2'), 175000, true) ->> 'counted')::boolean = false, 'una repetición inmediata es válida pero no vuelve a contar');
select tests.expect_true((select play_count = 1 from public.tracks where id = tests.id('track')), 'el contador de reproducciones válidas es 1');
select tests.expect_count($$select 1 from public.play_sessions where completed$$, 1, 'se detecta la reproducción completa');
select tests.expect_count('select * from public.recently_played()', 1, 'reproducciones recientes sin duplicados');
select tests.logout();

select tests.login(tests.id('alice'));
select tests.expect_count('select 1 from public.play_sessions', 0, 'nadie ve las escuchas de otros usuarios');
select tests.expect_count('select 1 from public.listening_history', 0, 'nadie ve el historial de otros usuarios');
select tests.expect_error($$select public.report_play_progress(tests.id('s1'), 100000)$$, 'nadie puede informar progreso en sesiones ajenas', 'ordyx:not_found');
select tests.logout();

-- ---------------------------------------------------------------- favoritos y privacidad
select tests.login(tests.id('bob'));
insert into public.likes (user_id, track_id) values (tests.id('bob'), tests.id('track'));
select tests.expect_true((select like_count = 1 from public.tracks where id = tests.id('track')), 'el contador de me gusta se actualiza');
select tests.expect_error($$insert into public.likes (user_id, track_id) values (tests.id('alice'), tests.id('track'))$$, 'nadie da me gusta en nombre de otro');
select tests.logout();
select tests.login(tests.id('alice'));
select tests.expect_count('select 1 from public.likes', 0, 'los favoritos ajenos son privados por defecto');
select tests.logout();
select tests.login(tests.id('bob'));
update public.user_settings set show_likes_public = true where user_id = tests.id('bob');
select tests.logout();
select tests.login(tests.id('alice'));
select tests.expect_count('select 1 from public.likes', 1, 'los favoritos se ven si el usuario los hace públicos');
select tests.logout();

-- ---------------------------------------------------------------- playlists
select tests.login(tests.id('bob'));
insert into public.playlists (id, title) values ('20000000-0000-0000-0000-000000000001', 'Mi lista');
insert into tests.ids values ('pl', '20000000-0000-0000-0000-000000000001');
insert into public.playlist_tracks (playlist_id, track_id) values (tests.id('pl'), tests.id('track'));
insert into public.playlist_tracks (playlist_id, track_id) values (tests.id('pl'), tests.id('track'));
insert into public.playlist_tracks (playlist_id, track_id) values (tests.id('pl'), tests.id('track'));
select tests.expect_true((select track_count = 3 and duration_ms = 540000 from public.playlists where id = tests.id('pl')), 'número de canciones y duración total');
select public.move_playlist_track((select max(id) from public.playlist_tracks), 1);
select tests.expect_true((select array_agg(id order by position) = (select array[max(id), min(id), (select id from public.playlist_tracks order by id offset 1 limit 1)] from public.playlist_tracks) from public.playlist_tracks), 'reordenar mueve la última canción al principio');
select tests.logout();

select tests.login(tests.id('alice'));
select tests.expect_count('select 1 from public.playlists', 0, 'las playlists privadas no son visibles para otros');
select tests.logout();
select tests.login(null);
select tests.expect_count('select 1 from public.playlist_tracks', 0, 'el contenido de playlists privadas tampoco');
select tests.logout();

select tests.login(tests.id('bob'));
update public.playlists set is_public = true where id = tests.id('pl');
select tests.logout();
select tests.login(tests.id('alice'));
select tests.expect_count('select 1 from public.playlists', 1, 'las playlists públicas son visibles');
select tests.expect_error($$insert into public.playlist_tracks (playlist_id, track_id) values (tests.id('pl'), tests.id('track'))$$, 'nadie añade canciones a playlists ajenas');
select tests.expect_error($$select public.move_playlist_track((select min(id) from public.playlist_tracks), 2)$$, 'nadie reordena playlists ajenas', 'ordyx:not_allowed');
delete from public.playlists where id = tests.id('pl');
update public.playlists set title = 'mía' where id = tests.id('pl');
insert into public.saved_playlists (user_id, playlist_id) values (tests.id('alice'), tests.id('pl'));
select tests.logout();
select tests.expect_true((select title = 'Mi lista' and save_count = 1 from public.playlists where id = tests.id('pl')), 'nadie edita ni borra playlists ajenas, pero sí puede guardarlas');

-- ---------------------------------------------------------------- comentarios, seguidores y bloqueos
select tests.login(tests.id('bob'));
insert into public.comments (track_id, user_id, body, timestamp_ms) values (tests.id('track'), tests.id('bob'), '¡Me encanta!', 42000);
select tests.expect_error($$insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('bob'), '¡me encanta!')$$, 'antispam: comentario duplicado', 'ordyx:rate_limited');
insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('bob'), 'dos');
insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('bob'), 'tres');
insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('bob'), 'cuatro');
insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('bob'), 'cinco');
select tests.expect_error($$insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('bob'), 'seis')$$, 'límite de 5 comentarios por minuto', 'ordyx:rate_limited');
select tests.expect_error($$insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('alice'), 'suplantación')$$, 'nadie comenta en nombre de otro');
insert into public.follows (follower_id, followee_id) values (tests.id('bob'), tests.id('alice'));
select tests.expect_error($$insert into public.follows (follower_id, followee_id) values (tests.id('bob'), tests.id('bob'))$$, 'no se puede seguir a uno mismo');
select tests.logout();
select tests.expect_true((select follower_count = 1 from public.profiles where id = tests.id('alice')), 'contador de seguidores');
select tests.expect_true((select comment_count = 5 from public.tracks where id = tests.id('track')), 'contador de comentarios');
select tests.expect_count($$select 1 from public.notifications where user_id = tests.id('alice') and type in ('new_follower', 'new_comment')$$, 6, 'notificaciones de seguidor y comentarios');

select tests.login(tests.id('alice'));
select tests.expect_count($$select 1 from public.notifications$$, 8, 'el usuario ve solo sus notificaciones (incluido el aviso de Premium regalado)');
update public.comments set body = 'editado' where user_id = tests.id('bob');
select tests.expect_count($$select 1 from public.comments where body = 'editado'$$, 0, 'nadie edita comentarios ajenos');
delete from public.comments where body = 'cinco';
select tests.expect_count($$select 1 from public.comments$$, 4, 'el artista puede borrar comentarios en sus canciones');
insert into public.blocks (blocker_id, blocked_id) values (tests.id('alice'), tests.id('bob'));
select tests.expect_count($$select 1 from public.comments$$, 0, 'los comentarios de usuarios bloqueados se ocultan');
select tests.logout();
select tests.expect_true((select follower_count = 0 from public.profiles where id = tests.id('alice')), 'bloquear elimina el seguimiento');
select tests.login(tests.id('bob'));
select tests.expect_error($$insert into public.comments (track_id, user_id, body) values (tests.id('track'), tests.id('bob'), 'hola')$$, 'un usuario bloqueado no puede comentar en las canciones de quien le bloquea');
select tests.expect_error($$insert into public.follows (follower_id, followee_id) values (tests.id('bob'), tests.id('alice'))$$, 'un usuario bloqueado no puede seguir');
select tests.expect_count($$select 1 from public.blocks$$, 0, 'los bloqueos son privados de quien bloquea');
select tests.logout();

-- ---------------------------------------------------------------- denuncias y reclamaciones
select tests.login(tests.id('bob'));
insert into public.reports (reporter_id, target_type, target_id, reason, details) values (tests.id('bob'), 'track', tests.id('track'), 'copyright', 'Es mía');
select tests.expect_error($$insert into public.reports (reporter_id, target_type, target_id, reason) values (tests.id('bob'), 'track', tests.id('track'), 'spam')$$, 'una sola denuncia abierta por usuario y elemento');
select tests.logout();
select tests.login(tests.id('alice'));
select tests.expect_count('select 1 from public.reports', 0, 'las denuncias de otros no son visibles');
select tests.logout();
select tests.login(null);
select tests.expect_true(public.submit_rights_claim('Sello S.L.', 'legal@sello.test', 'https://ordyx.app/t/10000000-0000-0000-0000-000000000001', 'Obra X', 'Esta canción reproduce nuestra obra X sin licencia.', true) is not null, 'cualquiera puede enviar una reclamación de derechos');
select tests.expect_error('select 1 from public.rights_claims', 'las reclamaciones no son públicas', 'permission denied');
select tests.logout();
select tests.expect_true((select track_id = tests.id('track') from public.rights_claims), 'la reclamación se enlaza a la canción');
select tests.login(tests.id('root'));
select public.admin_resolve_report((select id from public.reports), 'resolved', 'Revisado');
select public.admin_review_track(tests.id('track'), 'remove', 'Retirada por reclamación');
select tests.logout();
select tests.login(tests.id('bob'));
select tests.expect_count('select 1 from public.tracks', 0, 'las canciones retiradas dejan de ser visibles');
select tests.expect_count($$select 1 from storage.objects where bucket_id = 'audio'$$, 0, 'y su audio deja de poder firmarse');
select tests.logout();

-- ---------------------------------------------------------------- versiones de la app
select tests.login(tests.id('alice'));
select tests.expect_error($$select public.admin_save_app_version(null, '{}'::jsonb)$$, 'solo administración gestiona versiones', 'ordyx:not_allowed');
select tests.logout();
select tests.login(tests.id('root'));
insert into tests.ids values ('v1', public.admin_save_app_version(null, jsonb_build_object(
  'platform', 'android', 'channel', 'stable', 'version', '1.0.0', 'build_number', 1, 'install_method', 'apk',
  'download_url', 'https://downloads.example.com/ordyx-1.0.0.apk', 'file_size_bytes', 1000, 'sha256', repeat('a', 64))));
select tests.expect_error($$select public.admin_save_app_version(null, jsonb_build_object('platform', 'ios', 'version', '1.0.0', 'build_number', 1, 'install_method', 'apk', 'download_url', 'https://x.test/a'))$$, 'un APK no puede publicarse como versión iOS', 'ordyx:invalid_input');
select tests.expect_error($$select public.admin_publish_app_version(tests.id('v1'))$$, 'no se publica una versión sin verificar', 'ordyx:invalid_state');
select tests.expect_error($$select public.admin_verify_app_version(tests.id('v1'), repeat('b', 64), 1000, true)$$, 'la verificación falla si el hash no coincide', 'ordyx:invalid_input');
select tests.expect_error($$select public.admin_verify_app_version(tests.id('v1'), repeat('a', 64), 1000, false)$$, 'hay que confirmar la prueba de instalación', 'ordyx:invalid_input');
select public.admin_verify_app_version(tests.id('v1'), repeat('a', 64), 1000, true);
select public.admin_publish_app_version(tests.id('v1'));
select tests.logout();
select tests.login(null);
select tests.expect_count($$select 1 from public.current_app_versions where platform = 'android'$$, 1, 'la web ve la versión publicada');
select tests.expect_error($$update public.app_versions set status = 'withdrawn'$$, 'anónimos no modifican versiones', 'permission denied');
select tests.expect_count($$select 1 from public.app_config where key = 'auto_publish_verified_artists'$$, 0, 'la configuración privada no se expone');
select tests.expect_count($$select 1 from public.app_config where key = 'platform_name'$$, 1, 'la configuración pública sí');
select tests.logout();
select tests.login(tests.id('root'));
select public.admin_withdraw_app_version(tests.id('v1'), 'Fallo al iniciar en Android 9');
select tests.logout();
select tests.login(null);
select tests.expect_count($$select 1 from public.current_app_versions$$, 0, 'una versión retirada deja de anunciarse');
select tests.logout();
select tests.expect_count($$select 1 from public.admin_audit_logs where action like 'app_version.%'$$, 4, 'las acciones sobre versiones quedan auditadas');

-- ---------------------------------------------------------------- suspensión, exportación y estadísticas
select tests.login(tests.id('root'));
select public.admin_set_user_status(tests.id('bob'), 'suspended', 'Spam');
select tests.expect_true((public.admin_stats() ->> 'users_total')::int = 5, 'estadísticas agregadas para administración');
select tests.logout();
select tests.login(tests.id('bob'));
select tests.expect_error($$insert into public.playlists (title) values ('otra')$$, 'una cuenta suspendida no puede crear contenido');
select tests.expect_error($$select public.start_play(tests.id('track'))$$, 'una cuenta suspendida no reproduce', 'ordyx:');
select tests.expect_true((public.export_my_data() -> 'profile' ->> 'username') = 'bob', 'el usuario puede exportar sus datos');
select tests.logout();
select tests.login(tests.id('alice'));
select tests.expect_error($$select public.admin_stats()$$, 'las estadísticas globales requieren rol de staff', 'ordyx:not_allowed');
select tests.logout();

-- ---------------------------------------------------------------- privilegios por defecto
select tests.expect_true(not has_function_privilege('anon', 'public.submit_track(uuid, boolean)', 'execute'), 'anon no puede ejecutar RPC de usuarios');
select tests.expect_true(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), 'las funciones internas no son invocables desde la API');
select tests.expect_true(not has_table_privilege('anon', 'public.tracks', 'insert'), 'anon no puede insertar en tablas');
select tests.expect_true(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
  'TODAS las tablas de public tienen RLS activado');



-- ---------------------------------------------------------------- superficie de la API
select tests.expect_true(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname in ('has_role', 'is_admin', 'is_moderator', 'is_active_user', 'is_blocked_between',
                        'is_artist_member', 'is_artist_owner', 'can_upload', 'can_view_track', 'likes_are_public')
  ),
  'las auxiliares de RLS no están en el esquema expuesto por la API');
select tests.expect_true(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc ~ 'public\.(has_role|is_admin|is_moderator|is_active_user|can_upload|can_view_track|is_artist_member)\('
  ),
  'ninguna función sigue llamando a auxiliares en public');
\echo '✔ Todas las pruebas de seguridad han pasado'
