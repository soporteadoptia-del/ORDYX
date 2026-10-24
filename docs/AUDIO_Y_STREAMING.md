# Audio, almacenamiento y streaming

## Buckets

| Bucket | Acceso | Límite | Uso |
|---|---|---|---|
| `audio` | **Privado**. Lectura por URL firmada (1 h) si la canción está publicada (usuarios con sesión) o es tuya / eres moderación | 200 MB, solo tipos de audio | Originales `{uid}/{track_id}/original.{ext}` |
| `covers` | Lectura pública, escritura en carpeta propia | 5 MB, JPG/PNG/WebP | Portadas de canciones/álbumes e imágenes de artista |
| `avatars` | Ídem | 5 MB | Fotos de perfil |
| `playlist-images` | Ídem | 5 MB | Portadas de playlists |
| `releases` | Lectura pública, escritura solo administración | — | APK publicados |

> **Plan Free de Supabase:** el límite global por archivo no puede superar **50 MB** (Pro: hasta 500 GB). Con Free, el límite real del bucket `audio` será 50 MB y un APK de más de 50 MB debe alojarse fuera (p. ej. GitHub Releases) y registrarse por URL.

Las URL firmadas no son DRM: quien tiene acceso legítimo puede guardar lo que escucha. Lo que sí garantizan es que el audio **no publicado** no es accesible y que los enlaces caducan.

## Costes orientativos (tarifas de la documentación de Supabase, octubre 2026)

| Concepto | Free | Pro (25 $/mes) |
|---|---|---|
| Tráfico de salida sin caché | 5 GB | 250 GB incluidos, después 0,09 $/GB |
| Tráfico desde CDN (caché) | 5 GB | 250 GB incluidos, después 0,03 $/GB |
| Almacenamiento | 1 GB | 100 GB incluidos, después ≈0,021 $/GB-mes |

Cálculo de referencia: una canción de 3,5 min en AAC 128 kbps ≈ 3,4 MB. **1 000 oyentes × 20 canciones/día ≈ 2 TB/mes** → en Pro, unos 160 $/mes de tráfico sin caché. Un WAV original es 5–10 veces mayor: **no deben servirse originales a escala**. Estas cifras son estimaciones; comprueba la página de precios vigente antes de decidir.

## Proceso de transcodificación (diseñado, no activado)

Supabase no transcodifica audio. Diseño previsto, activable con `app_config.transcoding_enabled = true`:

1. `submit_track` deja la canción en `processing`.
2. Un *worker* fuera de Supabase (contenedor con `ffmpeg`, p. ej. en Fly.io, Cloud Run o un VPS) recibe el aviso por un Database Webhook, descarga el original con service_role y:
   - verifica el formato y la duración real con `ffprobe` (sustituye la duración que envía el cliente);
   - normaliza el volumen (`loudnorm`, −14 LUFS);
   - genera `stream_aac_128.m4a` (y opcionalmente 64 kbps para datos móviles);
   - lo sube a `audio/{uid}/{track_id}/stream_aac_128.m4a`.
3. Actualiza `tracks` (`audio_path` → versión de streaming, `duration_ms`, `audio_size_bytes`) y la pasa a `pending_review`.
4. Si falla, vuelve a `draft` con `review_note` y notificación al artista.

## Migrar a un CDN o proveedor especializado

Todo el acceso al audio pasa por `resolveStreamUrl()` en `apps/mobile/src/lib/media.ts`. Para pasar a Cloudflare R2/Stream, Bunny, Mux u otro:
1. Marcar las canciones con `storage_provider = 'external'` y guardar su clave en `audio_path`.
2. Crear una Edge Function `stream-url` que compruebe con RLS que el usuario puede ver la canción y devuelva una URL firmada del proveedor.
3. Cambiar `resolveStreamUrl` para llamar a esa función cuando el proveedor sea externo.
No hace falta cambiar pantallas, reproductor ni base de datos.
