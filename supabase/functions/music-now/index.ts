// Edge Function pública: música actual de Audius (red abierta de artistas independientes).
// - Solo lectura de datos públicos; no usa claves ni datos de usuarios, por eso no exige JWT.
// - Normaliza la respuesta y la deja en caché 10 minutos para no cargar a Audius.
// - Solo devuelve canciones que Audius permite reproducir en streaming sin restricciones.
// El audio NO pasa por aquí: la app lo pide directamente a Audius (cuenta como escucha del artista).

const API = 'https://api.audius.co/v1';
const APP = 'AurevixMusic';
const GENRES = new Set([
  'Electronic', 'Hip-Hop/Rap', 'Latin', 'Pop', 'R&B/Soul', 'Alternative', 'Rock', 'Lo-Fi',
  'House', 'Techno', 'Dubstep', 'Drum & Bass', 'Ambient', 'Jazz', 'Acoustic', 'Experimental',
  'Trap', 'Funk', 'Reggae', 'Dancehall', 'Soundtrack', 'World', 'Folk', 'Classical',
]);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface AudiusTrack {
  id: string;
  title: string;
  genre: string | null;
  duration: number;
  play_count: number;
  permalink: string;
  is_streamable?: boolean;
  is_stream_gated?: boolean;
  is_delete?: boolean;
  is_available?: boolean;
  artwork?: Record<string, string> | null;
  user: { name: string; handle: string; is_verified?: boolean };
}

function normalize(t: AudiusTrack) {
  return {
    id: t.id,
    title: t.title,
    artist: t.user?.name ?? 'Artista',
    handle: t.user?.handle ?? null,
    verified: !!t.user?.is_verified,
    genre: t.genre,
    durationMs: Math.round((t.duration ?? 0) * 1000),
    plays: t.play_count ?? 0,
    artwork: t.artwork?.['480x480'] ?? t.artwork?.['150x150'] ?? null,
    artworkLarge: t.artwork?.['1000x1000'] ?? t.artwork?.['480x480'] ?? null,
    url: `https://audius.co${t.permalink}`,
    streamUrl: `${API}/tracks/${encodeURIComponent(t.id)}/stream?app_name=${APP}`,
  };
}

function json(body: unknown, status = 200, cache = 600) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? `public, max-age=${cache}, s-maxage=${cache}` : 'no-store',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const u = new URL(req.url);
  const view = u.searchParams.get('view') ?? 'trending';
  const limit = Math.min(50, Math.max(1, Number(u.searchParams.get('limit')) || 20));
  const params = new URLSearchParams({ app_name: APP, limit: String(limit) });
  let path: string;

  if (view === 'trending' || view === 'underground') {
    const time = u.searchParams.get('time');
    params.set('time', time === 'month' || time === 'allTime' ? time : 'week');
    const genre = u.searchParams.get('genre');
    if (genre && GENRES.has(genre)) params.set('genre', genre);
    path = view === 'underground' ? '/tracks/trending/underground' : '/tracks/trending';
  } else if (view === 'search') {
    const q = (u.searchParams.get('q') ?? '').trim().slice(0, 80);
    if (q.length < 2) return json({ data: [] });
    params.set('query', q);
    path = '/tracks/search';
  } else {
    return json({ error: 'invalid_view' }, 400);
  }

  try {
    const res = await fetch(`${API}${path}?${params}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
    const body = (await res.json()) as { data?: AudiusTrack[] };
    const data = (body.data ?? [])
      .filter((t) => t.is_streamable !== false && !t.is_stream_gated && !t.is_delete && t.is_available !== false)
      .map(normalize);
    return json({ data, source: 'audius' }, 200, view === 'search' ? 120 : 600);
  } catch {
    return json({ error: 'upstream_unavailable' }, 502);
  }
});
