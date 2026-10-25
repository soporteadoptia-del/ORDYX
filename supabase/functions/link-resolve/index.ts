// Edge Function pública: convierte enlaces de YouTube, SoundCloud y Spotify (o líneas de texto
// «Artista - Canción») en búsquedas, para importar listas a Aurevix.
// - Solo usa los oEmbed públicos de cada servicio (título y autor); no descarga ni copia audio.
// - Los vídeos de YouTube se reproducen después con su reproductor oficial incrustado.
// - Máximo 100 elementos por llamada; sin datos de usuarios, por eso no exige JWT.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Resolved = {
  input: string;
  source: 'youtube' | 'soundcloud' | 'spotify' | 'text';
  query: string;
  title: string | null;
  artist: string | null;
  youtubeId: string | null;
  thumbnail: string | null;
  error?: string;
};

const NOISE =
  /\s*[([](official|oficial|video|vídeo|audio|lyrics?|letra|visualizer|music video|hd|4k|remaster(ed)?|explicit)[^)\]]*[)\]]/gi;

function clean(s: string) {
  return s.replace(NOISE, '').replace(/\s+/g, ' ').trim();
}

function youtubeId(u: URL): string | null {
  if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (/(^|\.)youtube\.com$/.test(u.hostname)) {
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
    if (m) return m[2];
  }
  return null;
}

async function oembed(url: string) {
  const res = await fetch(url, { headers: { 'user-agent': 'AurevixMusic/1.0' } });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
}

async function resolve(raw: string): Promise<Resolved> {
  const input = raw.trim();
  const base: Resolved = {
    input,
    source: 'text',
    query: clean(input),
    title: null,
    artist: null,
    youtubeId: null,
    thumbnail: null,
  };
  let u: URL | null = null;
  try {
    u = new URL(input);
  } catch {
    // línea de texto: «Artista - Canción»
    const [a, ...rest] = input.split(/\s+[-–—]\s+/);
    if (rest.length) return { ...base, artist: a.trim(), title: clean(rest.join(' - ')) };
    return base;
  }
  try {
    const yt = youtubeId(u);
    if (yt) {
      const o = await oembed(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt}`)}`,
      );
      const title = clean(o.title ?? '');
      const author = (o.author_name ?? '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '');
      const hasDash = /\s[-–—]\s/.test(title);
      return {
        ...base,
        source: 'youtube',
        youtubeId: yt,
        title,
        artist: hasDash ? title.split(/\s[-–—]\s/)[0] : author,
        query: hasDash ? title : `${author} ${title}`.trim(),
        thumbnail: o.thumbnail_url ?? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      };
    }
    if (/(^|\.)soundcloud\.com$/.test(u.hostname)) {
      const o = await oembed(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(input)}`,
      );
      const t = (o.title ?? '').replace(/ by .+$/, '');
      return {
        ...base,
        source: 'soundcloud',
        title: clean(t),
        artist: o.author_name ?? null,
        query: clean(`${o.author_name ?? ''} ${t}`),
        thumbnail: o.thumbnail_url ?? null,
      };
    }
    if (/(^|\.)spotify\.com$/.test(u.hostname)) {
      if (!/\/track\//.test(u.pathname))
        return { ...base, source: 'spotify', error: 'spotify_list' };
      const o = await oembed(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(input)}`,
      );
      return {
        ...base,
        source: 'spotify',
        title: clean(o.title ?? ''),
        query: clean(o.title ?? ''),
        thumbnail: o.thumbnail_url ?? null,
      };
    }
    return { ...base, error: 'unsupported' };
  } catch {
    return { ...base, error: 'not_found' };
  }
}

// Búsqueda en YouTube (API oficial YouTube Data v3) para las canciones que no están en otro
// sitio. Necesita el secreto YOUTUBE_API_KEY; sin él responde `no_key` y la app lo omite.
async function searchYouTube(queries: string[]) {
  const key = Deno.env.get('YOUTUBE_API_KEY');
  if (!key) return { error: 'no_key' as const, data: [] };
  const data = await Promise.all(
    queries.slice(0, 50).map(async (q) => {
      try {
        const u = new URL('https://www.googleapis.com/youtube/v3/search');
        u.search = new URLSearchParams({
          part: 'snippet',
          type: 'video',
          videoEmbeddable: 'true',
          videoCategoryId: '10',
          maxResults: '1',
          q,
          key,
        }).toString();
        const res = await fetch(u);
        if (!res.ok) return { q, id: null, title: null, artist: null, thumbnail: null };
        const j = await res.json();
        const it = j.items?.[0];
        return {
          q,
          id: it?.id?.videoId ?? null,
          title: it ? clean(it.snippet.title) : null,
          artist: it?.snippet?.channelTitle?.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '') ?? null,
          thumbnail: it?.snippet?.thumbnails?.high?.url ?? null,
        };
      } catch {
        return { q, id: null, title: null, artist: null, thumbnail: null };
      }
    }),
  );
  return { data };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: cors });
  let items: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.search)) {
      const queries = body.search.filter(
        (x: unknown) => typeof x === 'string' && x.trim().length > 1 && x.length < 200,
      );
      return new Response(JSON.stringify(await searchYouTube(queries)), {
        headers: { ...cors, 'content-type': 'application/json' },
      });
    }
    items = (Array.isArray(body?.items) ? body.items : [])
      .filter((x: unknown) => typeof x === 'string' && x.trim().length > 1 && x.length < 400)
      .slice(0, 100);
  } catch {
    return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers: cors });
  }
  const out: Resolved[] = [];
  // De 6 en 6 para no saturar a los servicios.
  for (let i = 0; i < items.length; i += 6) {
    out.push(...(await Promise.all(items.slice(i, i + 6).map(resolve))));
  }
  return new Response(JSON.stringify({ data: out }), {
    headers: { ...cors, 'content-type': 'application/json' },
  });
});
