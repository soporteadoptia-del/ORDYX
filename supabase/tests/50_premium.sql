-- Aurevix Premium: publicar música exige Premium; insignia y estadísticas de artista.
\set QUIET on
set client_min_messages = notice;

-- Eve no tiene Premium: no puede crear artistas ni subir.
select tests.login(tests.id('eve'));
select tests.expect_true(not public.my_can_upload(), 'sin Premium no se puede subir música');
select tests.expect_error($$insert into public.artists (slug, name, created_by) values ('eve-band', 'Eve Band', tests.id('eve'))$$, 'sin Premium no se crea un perfil de artista');
select tests.expect_error($$select public.my_artist_stats(30)$$, 'las estadísticas de artista exigen Premium', 'ordyx:plus_required');
select tests.logout();
select tests.expect_true(not public.is_premium(tests.id('eve')), 'is_premium: Eve no es Premium');

-- El rol de artista ya no basta por sí solo.
select tests.login(tests.id('root'));
select public.admin_set_role(tests.id('eve'), 'artist', true);
select tests.logout();
select tests.login(tests.id('eve'));
select tests.expect_true(not public.my_can_upload(), 'el rol de artista sin Premium no permite subir');
select tests.logout();

-- Con Premium sí, sin pasar por la administración.
select tests.login(tests.id('root'));
select public.admin_grant_plus(tests.id('eve'), 1, 'Pruebas');
select tests.logout();
select tests.login(tests.id('eve'));
select tests.expect_true(public.my_can_upload(), 'con Premium se puede subir música');
insert into public.artists (slug, name, created_by) values ('eve-band', 'Eve Band', tests.id('eve'));
insert into tests.ids select 'eveartist', id from public.artists where slug = 'eve-band';
insert into public.tracks (id, artist_id, title, license, rights_holder, duration_ms)
values ('10000000-0000-0000-0000-0000000000e1', tests.id('eveartist'), 'Primera de Eve', 'cc0', 'Eve', 90000);
select tests.expect_true((public.my_artist_stats(30)->'tracks'->0->>'title') = 'Primera de Eve', 'my_artist_stats lista mis canciones');
select tests.logout();
select tests.expect_true(public.is_premium(tests.id('eve')), 'is_premium: Eve es Premium');

-- Si caduca, sus canciones siguen ahí pero no puede subir más.
update public.subscriptions set expires_at = now() - interval '1 minute' where user_id = tests.id('eve');
select tests.login(tests.id('eve'));
select tests.expect_true(not public.my_can_upload(), 'al caducar Premium ya no se puede subir');
select tests.expect_error($$insert into public.tracks (artist_id, title, license, rights_holder, duration_ms) values (tests.id('eveartist'), 'Otra', 'cc0', 'Eve', 90000)$$, 'sin Premium no se crean canciones nuevas');
select tests.expect_count($$select 1 from public.tracks where artist_id = tests.id('eveartist')$$, 1, 'las canciones anteriores se conservan');
select tests.logout();

-- La administración sube siempre.
select tests.login(tests.id('root'));
select tests.expect_true(public.my_can_upload(), 'la administración puede subir sin Premium');
select tests.logout();
select tests.expect_true(not has_function_privilege('anon', 'public.my_artist_stats(integer)', 'execute'), 'anon no lee estadísticas de artista');
\echo '✔ Pruebas de Aurevix Premium superadas'
