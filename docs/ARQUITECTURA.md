# Arquitectura de Ordyx

> Nombre de marca **provisional**: se cambia en `packages/shared/src/brand.ts`, `apps/mobile/app.config.ts` (variable `APP_NAME`) y en `app_config.platform_name` desde el panel.

## Visión general

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ apps/mobile  │   │  apps/web    │   │ apps/admin   │
│ Expo SDK 58  │   │ Next.js 16   │   │ Next.js 16   │
│ iOS/Android  │   │ web pública  │   │ panel staff  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │ clave publicable + JWT del usuario (nunca service_role)
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│ Supabase (proyecto ORDIX, eu-west-1)                │
│  Auth · PostgREST · Storage · Edge Functions        │
│  PostgreSQL 17: RLS en todas las tablas,            │
│  permisos por columna y funciones RPC validadas     │
└─────────────────────────────────────────────────────┘
```

| Paquete | Contenido |
|---|---|
| `packages/shared` | Marca, constantes (límites, reglas de reproducción), tipos de dominio, esquemas zod, lógica pura de la cola, utilidades de formato, detección de dispositivo y traducción de errores. Lo usan las tres apps. |
| `supabase/migrations` | 11 migraciones SQL versionadas: esquema, RLS, RPC, Storage, datos de referencia. |
| `supabase/functions/delete-account` | Edge Function (Deno) para el borrado de cuenta (necesita service_role, que solo existe en el servidor). |
| `supabase/tests` | Pruebas de seguridad SQL (≈100 aserciones) contra un PostgreSQL real. |
| `scripts/` | `test-db.sh`, `smoke-api.sh`, generador de marca, generador y carga de contenido demo. |

Se fusionaron `packages/types` y `packages/validation` en `packages/shared` para no crear paquetes vacíos; el contenido es el mismo.

## Decisiones técnicas

- **Expo SDK 58 + Expo Router + `expo-audio`.** `expo-audio` ofrece reproducción en segundo plano, controles en pantalla de bloqueo (`setActiveForLockScreen`), gestión de interrupciones (`interruptionMode: 'doNotMix'`) y streaming desde URL sin cargar el archivo en memoria. Limitación conocida: los botones «siguiente/anterior» de la pantalla de bloqueo solo existen en el modo `AudioPlaylist` de la librería; usamos un único `AudioPlayer` (necesitamos URL firmadas renovables y nuestra propia cola), así que la pantalla de bloqueo muestra reproducir/pausa y saltos de ±15 s. Si se quisieran esos botones, la alternativa es `react-native-track-player` (requiere desarrollo nativo adicional).
- **Sin service_role en clientes.** El panel de administración actúa con la sesión del administrador y la base de datos comprueba el rol en cada función `admin_*`. Solo la Edge Function de borrado de cuenta y el script de demo (ejecutado por el propietario) usan service_role.
- **Lógica sensible en SQL.** Publicar, contar reproducciones, moderar y gestionar versiones son funciones `SECURITY DEFINER` con `search_path` vacío, validaciones y registro de auditoría. Ningún contador ni estado puede modificarse desde el cliente (permisos por columna).
- **Auxiliares de RLS en el esquema `private`**, no expuesto por la API (corrige el aviso del Security Advisor).
- **Web con Cache Components.** Datos públicos con `'use cache'` + `cacheLife('minutes')`; si Supabase no responde, la web lo dice en lugar de mostrar enlaces sin verificar.
- **Panel separado** (`apps/admin`) para desplegarlo en otro dominio, con `noindex` y sin código administrativo en la web pública.

## Modelo de datos (resumen)

`profiles` (1:1 con `auth.users`) · `user_settings` · `user_roles` (artist/moderator/admin, fuera del perfil) · `artists` + `artist_members` · `genres` · `tracks` · `albums` + `album_tracks` · `playlists` + `playlist_tracks` + `saved_playlists` · `saved_albums` · `likes` · `follows` (usuario→usuario) + `artist_follows` · `blocks` · `comments` (con `timestamp_ms` para anclar al segundo) · `search_history` · `play_sessions` + `play_events` + `listening_history` · `notifications` · `reports` · `rights_claims` · `client_errors` · `app_versions` + vista `current_app_versions` · `app_config` · `admin_audit_logs`.

Estados de canción: `draft → (submit_track) → pending_review | processing | published`, `rejected`, `removed` (moderación). Una canción publicada no puede cambiar su audio sin volver a revisión (trigger `tracks_guard`).

## Reproducciones válidas

`start_play` crea una sesión; la app informa del tiempo **realmente escuchado** (no la posición) cada 15 s con `report_play_progress`. El servidor:
1. limita lo aceptado al tiempo real transcurrido desde el inicio (+2 s) y a la duración de la canción;
2. marca la sesión como válida a los 30 s (o al 90 % si la canción dura menos);
3. solo incrementa `play_count` si el mismo usuario no tuvo otra reproducción contada de esa canción en los últimos 5 min (evita contar recargas y bucles);
4. marca «completa» al 90 % de la duración;
5. limita a 300 sesiones/hora por usuario.

Los datos individuales de escucha solo los ve su titular; administración solo ve agregados (`admin_stats`).

## Seguridad: dónde se aplica cada regla

| Regla | Mecanismo |
|---|---|
| Nadie modifica datos ajenos | Políticas RLS `using/with check` por propietario |
| Nadie cambia su rol, estado, contadores o el estado de sus canciones | `revoke` + `grant update (columnas)` |
| Subidas solo en la carpeta propia y solo para canciones propias en borrador | Políticas de `storage.objects` |
| El audio no publicado no se puede descargar | Bucket privado + URLs firmadas que Storage solo emite si la política lo permite |
| Primer administrador | `bootstrap_first_admin(email)` solo ejecutable con service_role y una única vez |
| Antispam | Límites por trigger: 5 comentarios/min, 60/h, sin duplicados; 30 playlists/h; 10 denuncias/h; 200 follows/h; 60 likes/min |
| Bloqueos | Ocultan comentarios, impiden seguir y comentar en canciones de quien bloquea |
| Suspensión | `is_active_user()` en todas las políticas de creación |

## Funciones futuras (preparación)

- **Premium / sin anuncios:** añadir `subscriptions` y `entitlements` alimentadas por webhooks del proveedor de pagos (Edge Function); las políticas consultarían `private.has_entitlement()`. No hay pagos simulados.
- **Descargas offline:** requieren licencias que lo permitan y almacenamiento cifrado con caducidad; no basta con guardar el archivo. Diseño previsto: URL firmadas de descarga + clave por dispositivo + revalidación periódica.
- **Listas colaborativas:** columna `playlists.is_collaborative` ya existe; faltan la tabla de colaboradores y la política de inserción.
- **CDN / proveedor de audio externo:** `tracks.storage_provider` y el único punto de resolución de URL (`apps/mobile/src/lib/media.ts › resolveStreamUrl`).
- **Recomendaciones, letras con licencia, estadísticas para artistas, panel para sellos, monetización:** sobre `play_events` (agregación diaria) y nuevas tablas; no implementadas.
