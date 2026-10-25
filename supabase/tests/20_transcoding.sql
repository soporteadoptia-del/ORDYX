-- Pruebas de la cola de transcodificación (se ejecutan tras 10_security.sql).
\set QUIET on
set client_min_messages = notice;

-- Escenario: Alice (artista) sube una canción con la transcodificación activada.
update public.app_config set value = 'true' where key = 'transcoding_enabled';
select tests.login(tests.id('alice'));
insert into public.tracks (id, artist_id, title, license, rights_holder, duration_ms, audio_path)
values ('10000000-0000-0000-0000-000000000099', tests.id('artist'), 'Para transcodificar', 'cc0', 'Alice', 999999,
        '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000099/original.wav');
insert into storage.objects (bucket_id, name, metadata)
values ('audio', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000099/original.wav', '{"size": 5000000, "mimetype": "audio/wav"}');
select tests.expect_true(public.submit_track('10000000-0000-0000-0000-000000000099', true) = 'processing', 'con transcodificación activa la canción queda «en proceso»');
select tests.expect_error($$select * from public.claim_transcode_job()$$, 'los usuarios no pueden reclamar trabajos', 'permission denied');
select tests.expect_error($$select public.complete_transcode_job('10000000-0000-0000-0000-000000000099', 'x', 'audio/mp4', 1, 1)$$, 'los usuarios no pueden completar trabajos', 'permission denied');
select tests.expect_error($$update public.tracks set processing_attempts = 0 where id = '10000000-0000-0000-0000-000000000099'$$, 'los usuarios no tocan las columnas de procesamiento', 'permission denied');
select tests.logout();

-- El worker (service_role) reclama el trabajo; un segundo intento no obtiene el mismo trabajo.
set role service_role;
select tests.expect_count($$select * from public.claim_transcode_job()$$, 1, 'el worker reclama el trabajo pendiente');
select tests.expect_count($$select * from public.claim_transcode_job()$$, 0, 'un trabajo en curso no se entrega dos veces');
select tests.expect_error($$select public.complete_transcode_job('10000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-00000000000b/x/stream.m4a', 'audio/mp4', 1, 60000)$$, 'no se acepta una ruta fuera de la carpeta de la canción', 'ordyx:invalid_input');
select tests.expect_error($$select public.complete_transcode_job('10000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000099/stream_aac_128.m4a', 'audio/mp4', 1, 60000)$$, 'se exige que el archivo de streaming exista', 'ordyx:audio_missing');
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('audio', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000099/stream_aac_128.m4a', '{"size": 900000, "mimetype": "audio/mp4"}');
set role service_role;
select tests.expect_true(
  public.complete_transcode_job('10000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000099/stream_aac_128.m4a', 'audio/mp4', 900000, 61234) = 'pending_review',
  'al completar pasa a revisión');
reset role;
select tests.expect_true(
  (select duration_ms = 61234 and audio_mime = 'audio/mp4' and original_audio_path like '%original.wav' and audio_path like '%stream_aac_128.m4a'
   from public.tracks where id = '10000000-0000-0000-0000-000000000099'),
  'la duración medida por el servidor sustituye a la del cliente y se conserva el original');

-- Fallo permanente: vuelve a borrador con explicación y notificación.
select tests.login(tests.id('alice'));
insert into public.tracks (id, artist_id, title, license, rights_holder, duration_ms, audio_path)
values ('10000000-0000-0000-0000-000000000098', tests.id('artist'), 'Archivo roto', 'cc0', 'Alice', 1000,
        '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000098/original.mp3');
insert into storage.objects (bucket_id, name, metadata)
values ('audio', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000098/original.mp3', '{"size": 10, "mimetype": "audio/mpeg"}');
select public.submit_track('10000000-0000-0000-0000-000000000098', true);
select tests.logout();
set role service_role;
select * from public.claim_transcode_job();
select public.fail_transcode_job('10000000-0000-0000-0000-000000000098', 'ffprobe: no audio stream', true);
reset role;
select tests.expect_true((select status = 'draft' and review_note is not null from public.tracks where id = '10000000-0000-0000-0000-000000000098'), 'un archivo inválido vuelve a borrador con explicación');
select tests.expect_count($$select 1 from public.notifications where user_id = tests.id('alice') and payload ->> 'track_id' = '10000000-0000-0000-0000-000000000098'$$, 1, 'el artista recibe el aviso del fallo');
update public.app_config set value = 'false' where key = 'transcoding_enabled';

\echo '✔ Pruebas de transcodificación superadas'
