# Estado del proyecto (25 de octubre de 2026)

Leyenda: ✅ hecho y verificado · 🟡 hecho, verificación parcial · ⛔ bloqueado por algo externo · ⬜ pendiente

## Backend (Supabase)

| | Elemento | Verificación |
|---|---|---|
| ✅ | Esquema completo (29 tablas), RLS en todas, permisos por columna, 12 migraciones | `pnpm test:db`: ~100 pruebas de seguridad en PostgreSQL 16 con un *stub* de auth/storage de Supabase. Aplicado en ORDIX; comprobados en el proyecto real permisos, columnas protegidas, buckets y funciones expuestas |
| ✅ | Avisos del Security/Performance Advisor | Corregidos los que dependían del código (auxiliares RLS → `private`, índices de FKs). Quedan: RPC públicas intencionadas y «leaked password protection» (ajuste del panel) |
| ✅ | RPC: búsqueda, reproducciones válidas, publicación, playlists, exportación de datos, administración con auditoría | Pruebas SQL locales **y prueba en el proyecto real ORDIX** (`supabase/tests/remote/rls_smoke_rollback.sql`, 20/20, ejecutada dentro de una transacción revertida: no deja datos) |
| ✅ | Edge Function `delete-account` | Desplegada y activa en ORDIX. ⬜ No invocada contra el proyecto real (sin red hacia supabase.co desde este entorno) |
| ✅ | Copia del esquema anterior de ORDIX | `backups/` (fuera de git), restauración probada |
| ⬜ | Primer administrador | Necesita tu correo: `select public.bootstrap_first_admin('…')` |
| ⬜ | Contenido demo cargado | Script listo (`pnpm seed:demo`); requiere ejecutarlo con tu clave service_role |
| ✅ | Worker de transcodificación (`services/transcoder`) + cola en BD (migración 0012) | 5 pruebas con ffmpeg real, 12 pruebas SQL de la cola; migración aplicada en ORDIX y funciones restringidas a service_role. ⬜ Falta desplegarlo (necesita la clave service_role en tu hosting de contenedores) |

## App móvil

| | Elemento | Verificación |
|---|---|---|
| ✅ | Registro, login, recuperación de contraseña, verificación de correo, cierre de sesión local y global, sesión cifrada (AES + SecureStore) | Tipos y lint; pantallas renderizadas en navegador (capturas) con validación funcionando |
| ✅ | Inicio con secciones reales, búsqueda con filtros, historial y paginación, géneros | Tipos/lint/bundle |
| ✅ | Reproductor `expo-audio`: URL firmada real, cola, aleatorio, repetir, siguiente/anterior, búsqueda en la barra, segundo plano, pantalla de bloqueo, mini reproductor persistente, recuperación de errores, reanudación de la última cola | 5 pruebas unitarias con `expo-audio` simulado |
| ✅ | Biblioteca, favoritos sincronizados, historial, playlists (crear, editar, portada, pública/privada, reordenar, borrar, guardar ajenas, compartir) | Tipos/lint |
| ✅ | Perfiles, seguir, comentarios anclados al segundo, denuncias, bloqueos, notificaciones | Tipos/lint |
| ✅ | Estudio de artista: selección de audio, validación de formato/tamaño, duración, progreso real de subida, portada, derechos, envío a revisión, edición, retirada y borrado | Tipos/lint |
| ✅ | Ajustes: privacidad, exportar datos, borrar cuenta | Tipos/lint |
| ✅ | `app.config.ts` configurable, icono/splash/icono adaptativo propios, permisos mínimos, `eas.json` (development/preview/APK/AAB/IPA) | `expo export` Android y web compilan |
| 🟡 | Funcionamiento de extremo a extremo contra ORDIX | **No probado**: este entorno bloquea `tqeradkfojhojwbvryob.supabase.co` |
| ⛔ | APK firmado | Requiere tu cuenta de Expo/EAS (`eas build --profile production-apk`) |
| ⛔ | IPA / TestFlight | Requiere cuenta Apple Developer |
| ⬜ | Prueba en dispositivos físicos (segundo plano, llamadas, auriculares) | Necesita dispositivos y un build nativo |

## Web pública

| | Elemento | Verificación |
|---|---|---|
| ✅ | Portada con capturas reales, detección orientativa de dispositivo con elección manual, QR en escritorio, requisitos, FAQ, SEO (metadatos, JSON-LD, sitemap, robots, manifest) | `next build`; Playwright en iPhone 13, Pixel 7 y escritorio: pestaña correcta detectada, sin errores JS |
| ✅ | Botones Android/iPhone basados en `app_versions` publicadas; `/descargar/android` estable; historial de versiones; sin enlaces cuando no hay versión verificada o el backend no responde | 5 pruebas unitarias + comprobación de la redirección |
| ✅ | Privacidad, condiciones, aviso legal (borradores marcados), formulario de reclamación de derechos con validación y trampa anti-bots, páginas para compartir canciones y playlists | `next build` |
| ⬜ | Dominio y despliegue | Necesita tu hosting/dominio |

## Panel de administración

| | Elemento | Verificación |
|---|---|---|
| ✅ | Login, protección por proxy + verificación de sesión y rol en servidor, menú según rol | Sin sesión o con cookie falsificada → redirección a `/login` |
| ✅ | Resumen de estadísticas, usuarios (buscar, suspender, roles), revisión de canciones con escucha previa, denuncias y reclamaciones, comentarios, artistas/playlists destacados, géneros, versiones (subir APK, verificar SHA-256 en servidor, publicar, retirar), configuración, errores, auditoría | `next build`, tipos y lint; las operaciones están cubiertas por las pruebas SQL de las funciones `admin_*` |
| 🟡 | Uso real del panel contra ORDIX | No probado desde aquí (red bloqueada) |

## Calidad

- `pnpm test`: 29 pruebas (shared 19, web 5, mobile 5) ✅ · `pnpm test:db` ✅ · `pnpm typecheck` ✅ · `pnpm lint` ✅ (2 avisos en el test de mobile, necesarios para los *mocks* de jest) · Prettier aplicado.

## Qué necesito de ti

1. **Acceso de red** a `tqeradkfojhojwbvryob.supabase.co` en este entorno (Network access → Allowed domains) para probar de extremo a extremo.
2. **Correo del primer administrador** (o ejecuta tú `bootstrap_first_admin`).
3. **Cuenta de Expo** y ejecutar `eas init` / el primer `eas build` (las credenciales de firma deben ser tuyas).
4. **Cuenta Apple Developer** para TestFlight.
5. **Dominio** para la web y el panel, y **SMTP** para los correos de Auth.
6. Decisiones de marca: nombre definitivo e identificadores de app.
7. Datos del titular y revisión jurídica de las páginas legales.
