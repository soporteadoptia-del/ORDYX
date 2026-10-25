# Lista de comprobación para producción

## Backend
- [x] Migraciones aplicadas en ORDIX (0001–0012) y avisos de seguridad revisados
- [x] Prueba de RLS en el proyecto real (20/20, sin dejar datos)
- [x] Edge Function `delete-account` desplegada
- [ ] Primer administrador creado (`bootstrap_first_admin`)
- [ ] SMTP propio y plantillas de correo en español
- [ ] Redirect URLs de Auth configuradas
- [ ] Protección de contraseñas filtradas activada
- [ ] Plan de Supabase adecuado (límite de archivo, tráfico) y *spend cap* revisado
- [ ] Copias de seguridad / PITR según el plan
- [x] Worker de transcodificación implementado y probado
- [ ] Worker desplegado y `transcoding_enabled = true` antes de abrir subidas al público

## Apps
- [ ] Identificadores definitivos (`IOS_BUNDLE_ID`, `ANDROID_PACKAGE`) y nombre definitivo
- [ ] `EAS_PROJECT_ID` configurado; clave de firma Android respaldada
- [ ] APK de producción probado en dispositivos reales y publicado desde el panel
- [ ] Cuenta Apple Developer, build iOS en TestFlight con enlace público
- [ ] Pruebas manuales de la lista de `DISTRIBUCION_MOVIL.md`

## Web
- [ ] Dominio, HTTPS y variables configuradas
- [ ] Panel en dominio separado
- [ ] Capturas de las pantallas principales con contenido real (las actuales son del registro y el login)

## Legal
- [ ] Revisión profesional de privacidad, condiciones y aviso legal; datos del titular
- [ ] Decisión sobre licencias con entidades de gestión (ver `LEGAL.md`)
- [ ] Procedimiento interno de retirada y plazos
- [ ] Auditoría de accesibilidad
