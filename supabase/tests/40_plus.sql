-- Aurevix Plus: pago por Bizum revisado a mano, letras y estadísticas (tras 10_security.sql).
\set QUIET on
set client_min_messages = notice;

-- La letra ya no se puede leer directamente de la tabla.
-- Una canción publicada de Alice con letra (la de 10_security acabó retirada).
select tests.login(tests.id('alice'));
insert into public.tracks (id, artist_id, title, license, rights_holder, duration_ms, lyrics)
values ('10000000-0000-0000-0000-0000000000a1', tests.id('artist'), 'Con letra', 'cc0', 'Alice', 120000, '[00:01.00]Primera línea');
select tests.logout();
update public.tracks set status = 'published', published_at = now(), rights_confirmed_at = now(),
  audio_path = '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-0000000000a1/original.mp3'
  where id = '10000000-0000-0000-0000-0000000000a1';
insert into tests.ids values ('ltrack', '10000000-0000-0000-0000-0000000000a1');
select tests.expect_true(not has_column_privilege('anon', 'public.tracks', 'lyrics', 'select'), 'anon no lee la columna lyrics');
select tests.expect_true(not has_column_privilege('authenticated', 'public.tracks', 'lyrics', 'select'), 'authenticated no lee la columna lyrics');
select tests.expect_true(has_column_privilege('anon', 'public.tracks', 'title', 'select'), 'el resto de columnas sigue siendo legible');
select tests.expect_true(not has_function_privilege('anon', 'public.request_plus(text)', 'execute'), 'anon no puede pedir Plus');

-- Sin Plus
select tests.login(tests.id('dave'));
select tests.expect_true((select not active from public.my_plus()), 'Dave empieza sin Plus');
select tests.expect_true(public.has_lyrics(tests.id('ltrack')), 'has_lyrics avisa de que hay letra');
select tests.expect_error($$select public.get_lyrics(tests.id('ltrack'))$$, 'la letra exige Plus', 'ordyx:plus_required');
select tests.expect_error($$select public.my_listening_stats(30)$$, 'las estadísticas exigen Plus', 'ordyx:plus_required');

-- Solicitud
insert into tests.ids select 'pay1', (public.request_plus('Pagado desde mi Bizum')).id;
select tests.expect_true((select reference ~ '^AUR-[A-Z0-9]{6}$' and amount_cents = 499 and status = 'pending' from public.plus_payments where id = tests.id('pay1')), 'la solicitud tiene referencia AUR-XXXXXX y cuesta 4,99 €');
select tests.expect_true((public.request_plus(null)).id = tests.id('pay1'), 'pedir dos veces devuelve la misma solicitud pendiente');
select tests.expect_true((select pending_reference is not null from public.my_plus()), 'my_plus muestra la solicitud pendiente');
select tests.expect_error($$select public.admin_review_plus_payment(tests.id('pay1'), true)$$, 'un usuario normal no puede aprobar pagos', 'ordyx:not_allowed');
select tests.expect_error($$select public.admin_grant_plus(tests.id('dave'), 12)$$, 'un usuario normal no puede regalarse Plus', 'ordyx:not_allowed');
select tests.expect_error($$insert into public.subscriptions (user_id, expires_at) values (tests.id('dave'), now() + interval '1 year')$$, 'nadie se escribe la suscripción a mano', 'permission denied');
select tests.expect_error($$update public.plus_payments set status = 'approved' where id = tests.id('pay1')$$, 'nadie aprueba su propio pago', 'permission denied');
select tests.logout();

select tests.login(tests.id('alice'));
select tests.expect_count($$select 1 from public.plus_payments$$, 0, 'cada usuario solo ve sus propios pagos');
select tests.logout();

-- Aprobación
select tests.login(tests.id('root'));
select public.admin_review_plus_payment(tests.id('pay1'), true, 'Recibido');
select tests.expect_error($$select public.admin_review_plus_payment(tests.id('pay1'), true)$$, 'un pago no se aprueba dos veces', 'ordyx:invalid_state');
select tests.expect_count($$select 1 from public.admin_audit_logs where target_type = 'plus_payment'$$, 1, 'la aprobación queda auditada');
select tests.logout();

select tests.login(tests.id('dave'));
select tests.expect_true((select active and expires_at > now() + interval '27 days' and source = 'bizum' from public.my_plus()), 'tras aprobar, Dave tiene Plus durante un mes');
select tests.expect_true(public.get_lyrics(tests.id('ltrack')) like '[00:01.00]%', 'con Plus se lee la letra');
select tests.expect_true(public.my_listening_stats(30) ? 'minutes', 'con Plus hay estadísticas');
select tests.logout();

-- Renovación: se suma al tiempo que queda
select tests.login(tests.id('root'));
select public.admin_grant_plus(tests.id('dave'), 1, 'Regalo');
select tests.logout();
select tests.expect_true((select expires_at > now() + interval '58 days' from public.subscriptions where user_id = tests.id('dave')), 'regalar un mes se suma al que queda');

-- Rechazo y cancelación
select tests.login(tests.id('alice'));
insert into tests.ids select 'pay2', (public.request_plus(null)).id;
select tests.logout();
select tests.login(tests.id('root'));
select public.admin_review_plus_payment(tests.id('pay2'), false, 'No encuentro el Bizum');
select tests.logout();
select tests.login(tests.id('alice'));
select tests.expect_true((select not active and last_rejection_note = 'No encuentro el Bizum' from public.my_plus()), 'el rechazo se explica al usuario');
insert into tests.ids select 'pay3', (public.request_plus(null)).id;
select public.cancel_plus_request(tests.id('pay3'));
select tests.expect_true((select pending_reference is null from public.my_plus()), 'se puede cancelar una solicitud pendiente');
-- La propietaria de la canción siempre ve su letra.
select tests.expect_true(public.get_lyrics(tests.id('ltrack')) is not null, 'la propietaria lee su letra sin Plus');
select tests.logout();
\echo '✔ Pruebas de Aurevix Plus superadas'
