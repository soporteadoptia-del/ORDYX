-- Catálogo de la comunidad (canciones importadas visibles para todos).
\set QUIET on
set client_min_messages = notice;

select tests.login(tests.id('dave'));
select tests.expect_true(public.register_external_tracks('[
  {"source":"youtube","ref":"dQw4w9WgXcQ","title":"Never Gonna Give You Up","artist":"Rick Astley","cover_url":"https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg"},
  {"source":"soundcloud","ref":"https://soundcloud.com/artista/cancion","title":"Canción SC","artist":"Artista"},
  {"source":"youtube","ref":"no-valido","title":"Mal"},
  {"source":"spotify","ref":"x","title":"No admitido"}
]'::jsonb) = 2, 'se guardan solo los elementos válidos');
select tests.expect_error($$insert into public.external_tracks (source, ref, title) values ('youtube', 'aaaaaaaaaaa', 'x')$$, 'nadie inserta directamente', 'permission denied');
select tests.logout();

select tests.login(tests.id('eve'));
select public.register_external_tracks('[{"source":"youtube","ref":"dQw4w9WgXcQ","title":"Never Gonna Give You Up","artist":"Rick Astley"}]'::jsonb);
select tests.logout();
select tests.expect_true((select import_count = 2 from public.external_tracks where ref = 'dQw4w9WgXcQ'), 'importar lo mismo suma, no duplica');

-- Visible para cualquiera, incluso sin sesión.
set role anon;
select tests.expect_count($$select 1 from public.search_external_tracks('rick astley')$$, 1, 'anon encuentra lo importado por la comunidad');
reset role;

-- La moderación puede ocultarlo.
select tests.login(tests.id('dave'));
select tests.expect_error($$select public.admin_set_external_hidden((select id from public.external_tracks where ref = 'dQw4w9WgXcQ'), true)$$, 'un usuario no oculta canciones', 'ordyx:not_allowed');
select tests.logout();
select tests.login(tests.id('root'));
select public.admin_set_external_hidden((select id from public.external_tracks where ref = 'dQw4w9WgXcQ'), true);
select tests.logout();
select tests.login(tests.id('eve'));
select tests.expect_count($$select 1 from public.search_external_tracks('rick astley')$$, 0, 'lo oculto ya no aparece');
select tests.logout();
\echo '✔ Pruebas del catálogo de la comunidad superadas'
