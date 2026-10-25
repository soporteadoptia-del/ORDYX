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

## Transcodificación (`services/transcoder`, implementado y probado)

Supabase no transcodifica audio; lo hace un worker propio con `ffmpeg`, fuera de Supabase.

1. Con `app_config.transcoding_enabled = true` (panel → Configuración), `submit_track` deja la canción en **«En proceso»**.
2. El worker (`node src/worker.ts`, o la imagen del `Dockerfile`) reclama trabajos con `claim_transcode_job()` (`FOR UPDATE SKIP LOCKED`: puedes ejecutar varias instancias; un trabajo abandonado más de 30 min se reofrece, hasta 3 intentos).
3. Descarga el original **en streaming a disco** con una URL firmada de 10 min, lo valida con `ffprobe` (debe tener pista de audio y durar entre 1 s y 4 h) y genera `stream_aac_128.m4a`: AAC-LC 128 kbps, estéreo, 44,1 kHz, volumen normalizado a −14 LUFS y `faststart`.
4. Sube la versión de streaming junto al original y llama a `complete_transcode_job()`: la canción pasa a **revisión** (o se publica si el artista está verificado y `auto_publish_verified_artists` está activo), con la **duración medida por el servidor**. El original se conserva privado en `original_audio_path` para poder reprocesar.
5. Si el archivo no es válido, `fail_transcode_job()` devuelve la canción a borrador con una explicación y notifica al artista; los errores transitorios se reintentan.

Las funciones del worker solo las puede ejecutar `service_role` (comprobado en ORDIX). Ejemplo medido: una pista WAV de 75 s y 3,15 MB queda en 1,16 MB.

Puesta en marcha:
```bash
cd services/transcoder
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clave> node src/worker.ts   # o --once
npm test   # 5 pruebas con ffmpeg real
```
Despliegue: cualquier servicio de contenedores (Fly.io, Cloud Run, Railway, un VPS) con la clave service_role como **secreto del servicio**. Después, activa `transcoding_enabled` desde el panel.

## Migrar a un CDN o proveedor especializado

Todo el acceso al audio pasa por `resolveStreamUrl()` en `apps/mobile/src/lib/media.ts`. Para pasar a Cloudflare R2/Stream, Bunny, Mux u otro:
1. Marcar las canciones con `storage_provider = 'external'` y guardar su clave en `audio_path`.
2. Crear una Edge Function `stream-url` que compruebe con RLS que el usuario puede ver la canción y devuelva una URL firmada del proveedor.
3. Cambiar `resolveStreamUrl` para llamar a esa función cuando el proveedor sea externo.
No hace falta cambiar pantallas, reproductor ni base de datos.
