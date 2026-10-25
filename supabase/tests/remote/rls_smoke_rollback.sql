-- =====================================================================================
-- Prueba de RLS y funciones contra el proyecto REAL sin dejar datos.
-- Ejecutar en Supabase → SQL Editor (o vía MCP). Todo ocurre dentro de un bloque que termina
-- con un error forzado ("RESULTADO_RLS_REAL ok=N fallos=M ...") y por tanto se REVIERTE entero.
-- Resultado esperado: ok=20 fallos=0. Último resultado en ORDIX: 2026-10-25 → ok=20 fallos=0.
-- =====================================================================================
do $$
declare
  log text := '';
  ok int := 0;
  fail int := 0;
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  r uuid := gen_random_uuid();
  art uuid; trk uuid; sess uuid; pl uuid;
  n int; t text; failed boolean;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rlstest-a@ordyx.invalid', '{"username":"rlstest_alice"}', now(), now()),
         (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rlstest-b@ordyx.invalid', '{"username":"rlstest_bob"}', now(), now()),
         (r, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rlstest-r@ordyx.invalid', '{"username":"rlstest_root"}', now(), now());
  select count(*) into n from public.profiles where id in (a, b, r);
  if n = 3 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:perfiles'; end if;
  insert into public.user_roles (user_id, role) values (r, 'admin'), (a, 'artist');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.profiles set display_name = 'hack' where id = b;
  failed := false;
  begin update public.profiles set status = 'active' where id = a; exception when insufficient_privilege then failed := true; end;
  if failed then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:status'; end if;
  failed := false;
  begin insert into public.user_roles (user_id, role) values (a, 'admin'); exception when insufficient_privilege then failed := true; end;
  if failed then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:autoadmin'; end if;
  failed := false;
  begin perform public.admin_stats(); exception when others then failed := sqlerrm like '%ordyx:not_allowed%'; end;
  if failed then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:admin_stats'; end if;
  insert into public.artists (slug, name, created_by) values ('rlstest-band', 'RLS Test Band', a) returning id into art;
  trk := gen_random_uuid();
  insert into public.tracks (id, artist_id, owner_id, title, license, rights_holder, duration_ms, audio_path)
  values (trk, art, a, 'Prueba RLS', 'cc0', 'Alice', 120000, a::text || '/' || trk::text || '/original.mp3');
  failed := false;
  begin update public.tracks set status = 'published' where id = trk; exception when insufficient_privilege then failed := true; end;
  if failed then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:autopublicar'; end if;
  insert into storage.objects (bucket_id, name, owner_id, metadata) values ('audio', a::text || '/' || trk::text || '/original.mp3', a::text, '{"size": 1000, "mimetype": "audio/mpeg"}');
  if public.submit_track(trk, true) in ('pending_review', 'processing') then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:submit'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.tracks where id = trk;
  if n = 0 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:ve_pendiente'; end if;
  select count(*) into n from storage.objects where bucket_id = 'audio' and name like a::text || '/%';
  if n = 0 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:audio_pendiente'; end if;
  failed := false;
  begin perform public.is_blocked_between(a, b); exception when others then failed := true; end;
  if failed then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:aux_public'; end if;
  execute 'reset role';
  select display_name into t from public.profiles where id = b;
  if t is null then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:edita_ajeno'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.admin_review_track(trk, 'publish', 'ok');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from storage.objects where bucket_id = 'audio' and name like a::text || '/%';
  if n = 1 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:audio_publicado'; end if;
  sess := public.start_play(trk, 'test', 'track', null);
  if (public.report_play_progress(sess, 60000) ->> 'counted')::boolean is not true then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:antitrampa'; end if;
  insert into public.playlists (owner_id, title) values (b, 'privada') returning id into pl;
  insert into public.playlist_tracks (playlist_id, track_id, added_by) values (pl, trk, b);
  execute 'reset role';
  update public.play_sessions set started_at = now() - interval '45 seconds' where id = sess;
  execute 'set local role authenticated';
  if (public.report_play_progress(sess, 40000) ->> 'counted')::boolean then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:valida'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.playlists where id = pl;
  if n = 0 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:playlist_privada'; end if;
  select count(*) into n from public.play_sessions where user_id = b;
  if n = 0 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:escuchas_ajenas'; end if;
  failed := false;
  begin insert into public.playlist_tracks (playlist_id, track_id, added_by) values (pl, trk, a); exception when others then failed := true; end;
  if failed then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:playlist_ajena'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.search_catalog('prueba rls');
  if n >= 1 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:busqueda'; end if;
  select count(*) into n from storage.objects where bucket_id = 'audio';
  if n = 0 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:anon_audio'; end if;
  failed := false;
  begin perform 1 from public.user_settings limit 1; exception when insufficient_privilege then failed := true; end;
  if failed then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:anon_settings'; end if;
  execute 'reset role';

  select (select play_count from public.tracks where id = trk) into n;
  if n = 1 then ok := ok + 1; else fail := fail + 1; log := log || ' FALLO:play_count=' || n; end if;

  raise exception 'RESULTADO_RLS_REAL ok=% fallos=% %', ok, fail, log;
end $$;
