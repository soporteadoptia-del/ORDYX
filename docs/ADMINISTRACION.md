# Guía de administración

## Crear el primer administrador (una sola vez)

1. Regístrate en la app con tu correo y confírmalo.
2. En Supabase → SQL Editor (se ejecuta como propietario de la base de datos):
   ```sql
   select public.bootstrap_first_admin('tu-correo@ejemplo.com');
   ```
   Falla si ya existe un administrador. Ningún cliente puede ejecutarla (solo service_role/propietario).
3. Despliega el panel (`apps/admin`) e inicia sesión con esa cuenta.

A partir de ahí, los roles se conceden desde **Usuarios** (Artista, Moderación, Administración). Un administrador no puede retirarse su propio rol ni suspenderse a sí mismo.

## Roles

| Rol | Puede |
|---|---|
| Usuario | Escuchar, playlists, social, denunciar |
| Artista | Además: crear perfiles de artista, subir y gestionar sus canciones |
| Moderación | Revisar canciones, tramitar denuncias y reclamaciones, ocultar comentarios, ver usuarios y estadísticas |
| Administración | Todo lo anterior + roles, suspensiones, artistas verificados, géneros, versiones, configuración, errores y auditoría |

Todo se valida en el servidor: las páginas comprueban la sesión con Supabase Auth y el rol en `user_roles`; las funciones `admin_*` lo vuelven a comprobar en la base de datos y escriben en `admin_audit_logs`.

## Flujos

- **Revisión de canciones** (Canciones → Pendiente de revisión): escucha el audio (URL firmada de 10 min), comprueba metadatos, licencia y titular declarado. Publicar / Rechazar (con nota) / Retirar. El artista recibe una notificación.
- **Denuncias y derechos:** cada reclamación de derechos puede retirar la canción enlazada. Resuelve o desestima con nota: queda auditado y se notifica a quien denunció. Guarda la comunicación con el reclamante fuera del sistema (correo).
- **Versiones de la app:** ver `DISTRIBUCION_MOVIL.md`.
- **Configuración:** `platform_name`, `support_email`, `social_links` (`{"instagram":"https://…"}`), `maintenance_message` (texto o `null`), `min_supported_version`, `auto_publish_verified_artists`, `transcoding_enabled`.

## Seguridad operativa

- Usa contraseñas largas y activa en Supabase la protección de contraseñas filtradas y, si es posible, MFA para cuentas de staff.
- Despliega el panel en un dominio distinto de la web (p. ej. `admin.aurevixweb.es`), sin enlazarlo desde la web.
- Revisa periódicamente **Auditoría** y **Errores**.
