#!/usr/bin/env node
/**
 * Carga contenido de DEMOSTRACIÓN en Supabase: un usuario-artista de demo, un artista, varias canciones
 * originales sintetizadas (CC0, is_demo = true) y una playlist pública. Idempotente.
 *
 * Requiere la clave service_role SOLO en tu máquina (nunca en el repositorio ni en las apps):
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo.mjs
 * Para borrarlo:  ... node scripts/seed-demo.mjs --remove
 */
import { createClient } from '@supabase/supabase-js';
import { DEMO_TRACKS, renderTrack } from './demo-audio.mjs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const DEMO_EMAIL = 'demo-artist@ordyx.invalid';

async function demoUser() {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID() + 'Aa1', // cuenta sin acceso real: contraseña aleatoria no guardada
    user_metadata: { username: 'ordyx_demo', display_name: 'Ordyx Demo' },
  });
  if (error) throw error;
  return data.user.id;
}

async function remove() {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list?.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) return console.log('No hay contenido demo.');
  const { data: files } = await admin.storage.from('audio').list(user.id, { limit: 1000 });
  for (const f of files ?? []) {
    const { data: inner } = await admin.storage.from('audio').list(`${user.id}/${f.name}`);
    await admin.storage
      .from('audio')
      .remove((inner ?? []).map((i) => `${user.id}/${f.name}/${i.name}`));
  }
  await admin.auth.admin.deleteUser(user.id); // borra en cascada perfil, artista, canciones y playlist
  console.log('Contenido demo eliminado.');
}

async function seed() {
  const uid = await demoUser();
  await admin
    .from('user_roles')
    .upsert({ user_id: uid, role: 'artist' }, { onConflict: 'user_id,role' });
  let { data: artist } = await admin
    .from('artists')
    .select('id')
    .eq('slug', 'ordyx-demo')
    .maybeSingle();
  if (!artist) {
    const res = await admin
      .from('artists')
      .insert({
        slug: 'ordyx-demo',
        name: 'Ordyx Demo',
        bio: 'Artista de demostración: música original generada por síntesis para probar la plataforma.',
        created_by: uid,
      })
      .select('id')
      .single();
    if (res.error) throw res.error;
    artist = res.data;
  }
  const { data: genres } = await admin.from('genres').select('id,slug');
  const genreId = Object.fromEntries((genres ?? []).map((g) => [g.slug, g.id]));
  const trackIds = [];
  for (const spec of DEMO_TRACKS) {
    const { data: existing } = await admin
      .from('tracks')
      .select('id')
      .eq('artist_id', artist.id)
      .eq('title', spec.title)
      .maybeSingle();
    if (existing) {
      trackIds.push(existing.id);
      continue;
    }
    const id = crypto.randomUUID();
    const { buffer, durationMs } = renderTrack(spec);
    const path = `${uid}/${id}/original.wav`;
    const up = await admin.storage
      .from('audio')
      .upload(path, buffer, { contentType: 'audio/wav', upsert: true });
    if (up.error) throw up.error;
    const now = new Date().toISOString();
    const ins = await admin.from('tracks').insert({
      id,
      artist_id: artist.id,
      owner_id: uid,
      title: spec.title,
      description:
        'Pista de demostración generada por síntesis. No es una canción real de ningún artista.',
      genre_id: genreId[spec.genre] ?? null,
      audio_path: path,
      audio_mime: 'audio/wav',
      audio_size_bytes: buffer.length,
      duration_ms: durationMs,
      status: 'published',
      license: 'cc0',
      rights_holder: 'Proyecto Ordyx',
      rights_confirmed_at: now,
      published_at: now,
      is_demo: true,
    });
    if (ins.error) throw ins.error;
    trackIds.push(id);
    console.log(`✔ ${spec.title} (${(buffer.length / 1048576).toFixed(1)} MB)`);
  }
  let { data: playlist } = await admin
    .from('playlists')
    .select('id')
    .eq('owner_id', uid)
    .eq('title', 'Demo: primeros pasos')
    .maybeSingle();
  if (!playlist) {
    const res = await admin
      .from('playlists')
      .insert({
        owner_id: uid,
        title: 'Demo: primeros pasos',
        description: 'Playlist de demostración con pistas sintetizadas.',
        is_public: true,
      })
      .select('id')
      .single();
    if (res.error) throw res.error;
    playlist = res.data;
    for (const tid of trackIds)
      await admin
        .from('playlist_tracks')
        .insert({ playlist_id: playlist.id, track_id: tid, added_by: uid });
  }
  console.log('Contenido demo listo.');
}

(process.argv.includes('--remove') ? remove() : seed()).catch((e) => {
  console.error(e);
  process.exit(1);
});
