-- Listas colaborativas, mensajes y Fusión.
\set QUIET on
set client_min_messages = notice;

-- Alice crea una lista y la hace colaborativa.
select tests.login(tests.id('alice'));
insert into public.playlists (id, owner_id, title) values ('20000000-0000-0000-0000-0000000000c1', tests.id('alice'), 'Juntos');
update public.playlists set is_collaborative = true where id = '20000000-0000-0000-0000-0000000000c1';
select tests.logout();
insert into tests.ids values ('collab', '20000000-0000-0000-0000-0000000000c1');

-- Dave aún no es miembro: no puede añadir.
select tests.login(tests.id('dave'));
select tests.expect_error($$insert into public.playlist_tracks (playlist_id, track_id, added_by) values (tests.id('collab'), tests.id('ltrack'), tests.id('dave'))$$, 'sin unirse no se añaden canciones a una lista colaborativa');
select public.join_playlist(tests.id('collab'));
insert into public.playlist_tracks (playlist_id, track_id, added_by) values (tests.id('collab'), tests.id('ltrack'), tests.id('dave'));
select tests.expect_true((select track_count = 1 from public.playlists where id = tests.id('collab')), 'un miembro añade canciones y el contador se actualiza');
select tests.expect_count($$select 1 from public.my_collab_playlists()$$, 1, 'la lista aparece entre mis colaborativas');
update public.playlists set title = 'Mía' where id = tests.id('collab');
select tests.expect_true((select title = 'Juntos' from public.playlists where id = tests.id('collab')), 'un miembro no cambia el nombre de la lista');
select tests.logout();

-- Si deja de ser colaborativa, los miembros pierden el acceso.
select tests.login(tests.id('alice'));
update public.playlists set is_collaborative = false where id = tests.id('collab');
select tests.logout();
select tests.login(tests.id('dave'));
select tests.expect_count($$select 1 from public.playlists where id = tests.id('collab')$$, 0, 'una lista que deja de ser colaborativa ya no es visible para sus miembros');
select tests.expect_error($$select public.join_playlist(tests.id('collab'))$$, 'no se une nadie a una lista que no es colaborativa', 'ordyx:not_found');

-- Mensajes
insert into public.messages (recipient_id, body) values (tests.id('eve'), 'Escucha esto');
insert into public.messages (recipient_id, track_id) values (tests.id('eve'), tests.id('ltrack'));
select tests.expect_error($$insert into public.messages (sender_id, recipient_id, body) values (tests.id('eve'), tests.id('dave'), 'falso')$$, 'nadie envía mensajes en nombre de otro');
select tests.expect_error($$insert into public.messages (recipient_id, body) values (tests.id('eve'), '   ')$$, 'no se envían mensajes vacíos');
select tests.logout();

select tests.login(tests.id('eve'));
select tests.expect_true((select unread = 2 and last_kind = 'track' from public.my_conversations() where other_id = tests.id('dave')), 'Eve ve la conversación con 2 sin leer');
update public.messages set read_at = now() where recipient_id = tests.id('eve');
select tests.expect_true((select unread = 0 from public.my_conversations() where other_id = tests.id('dave')), 'marcar como leído');
select tests.logout();

select tests.login(tests.id('alice'));
select tests.expect_count($$select 1 from public.messages$$, 0, 'nadie lee mensajes ajenos');
-- Fusión: Alice y Dave no se siguen mutuamente.
select tests.expect_error($$select * from public.blend_with(tests.id('dave'))$$, 'la Fusión exige seguirse mutuamente', 'ordyx:blend_requires_mutual');
select tests.logout();

-- Eve sigue a Dave (Dave ya seguía a Eve): ahora pueden fusionar.
select tests.login(tests.id('eve'));
insert into public.follows (follower_id, followee_id) values (tests.id('eve'), tests.id('dave')) on conflict do nothing;
select tests.expect_true((select count(*) from public.blend_with(tests.id('dave'))) >= 0, 'con seguimiento mutuo la Fusión funciona');
select tests.logout();
\echo '✔ Pruebas de música en compañía superadas'
