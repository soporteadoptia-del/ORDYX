-- Reposts, actividad y géneros más escuchados.
\set QUIET on
set client_min_messages = notice;

-- Eve repostea la canción publicada de Alice; no puede repostear una que no está publicada.
select tests.login(tests.id('eve'));
insert into public.reposts (user_id, track_id) values (tests.id('eve'), tests.id('ltrack'));
select tests.expect_error($$insert into public.reposts (user_id, track_id) values (tests.id('eve'), '10000000-0000-0000-0000-0000000000e1')$$, 'no se repostea una canción sin publicar');
select tests.expect_error($$insert into public.reposts (user_id, track_id) values (tests.id('dave'), tests.id('ltrack'))$$, 'nadie repostea en nombre de otro');
select tests.logout();

-- Dave sigue a Eve y al artista de Alice: ve el repost y el lanzamiento en su actividad.
select tests.login(tests.id('dave'));
insert into public.follows (follower_id, followee_id) values (tests.id('dave'), tests.id('eve')) on conflict do nothing;
insert into public.artist_follows (user_id, artist_id) values (tests.id('dave'), tests.id('artist')) on conflict do nothing;
select tests.expect_true((select count(*) from public.my_feed(50) where kind = 'repost' and track_id = tests.id('ltrack')) = 1, 'el repost de Eve aparece en la actividad de Dave');
select tests.expect_true((select count(*) from public.my_feed(50) where kind = 'release') >= 1, 'los lanzamientos del artista seguido aparecen en la actividad');
select tests.expect_true(not exists (select 1 from public.my_feed(50) f join public.tracks t on t.id = f.track_id where t.status <> 'published'), 'la actividad solo muestra canciones publicadas');
select tests.expect_true((select count(*) from public.my_top_genres(3)) >= 0, 'my_top_genres responde');
select tests.logout();

select tests.login(tests.id('eve'));
delete from public.reposts where user_id = tests.id('eve') and track_id = tests.id('ltrack');
select tests.logout();
select tests.expect_count($$select 1 from public.reposts where user_id = tests.id('eve')$$, 0, 'se puede quitar un repost');
select tests.expect_true(not has_function_privilege('anon', 'public.my_feed(integer, timestamptz)', 'execute'), 'anon no lee actividad');
\echo '✔ Pruebas sociales superadas'
