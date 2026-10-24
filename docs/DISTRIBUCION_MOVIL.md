# Distribución de las apps móviles

## Resumen de la estrategia

| Plataforma | Método inicial (sin aprobaciones especiales) | Después |
|---|---|---|
| Android | **APK firmado descargable desde la web** (`/descargar/android` → siempre la última versión verificada) | Google Play (AAB) |
| iPhone/iPad | **TestFlight con enlace público** (beta oficial de Apple) | App Store. Distribución web UE solo si Apple aprueba la cuenta (ver más abajo) |

La web nunca muestra una versión que no esté **publicada** en `app_versions`, y solo se puede publicar una versión **verificada**: el panel descarga el archivo en el servidor, calcula su SHA-256 y tamaño y la base de datos los compara con los declarados; además hay que confirmar que la instalación se probó en un dispositivo real.

> Expo Updates (`eas update`) solo cambia JavaScript/recursos dentro de un binario ya instalado. Cualquier cambio nativo (nuevas librerías nativas, permisos, iconos, versión de SDK) requiere compilar y distribuir un binario nuevo. `runtimeVersion` está ligado a la versión de la app para no enviar actualizaciones incompatibles.

## Requisitos previos (los aporta el propietario)

1. Cuenta de **Expo** (gratuita) para EAS Build: `npx eas-cli@latest login`.
2. Vincular el proyecto: `cd apps/mobile && npx eas-cli@latest init` → anota el `projectId` y defínelo como `EAS_PROJECT_ID` (variable de entorno en EAS).
3. Identificadores definitivos: `IOS_BUNDLE_ID` y `ANDROID_PACKAGE` (por defecto `app.ordyx.music`). **No se pueden cambiar después de publicar.**
4. Variables públicas en EAS (`eas env:create`), ya presentes en `eas.json`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_WEB_URL`. **Nunca** añadas la clave service_role.

Perfiles en `apps/mobile/eas.json`:

| Perfil | Resultado | Uso |
|---|---|---|
| `development` | APK / build de desarrollo con `expo-dev-client` | Probar en dispositivos durante el desarrollo |
| `preview` | APK interno / IPA ad hoc, sufijo `.preview`, nombre «(Beta)» | Pruebas internas |
| `production-apk` | **APK firmado de producción** | Descarga directa desde la web |
| `production` | AAB (Google Play) e IPA de App Store/TestFlight | Tiendas |

## Android: APK firmado

```bash
cd apps/mobile
npx eas-cli@latest build --profile production-apk --platform android
```

- La primera vez EAS ofrece **generar y custodiar la clave de firma** (recomendado) o subir tu propio keystore. Haz copia de seguridad (`eas credentials` → Android → Download). **Si pierdes la clave, no podrás publicar actualizaciones que se instalen encima de la versión anterior.** El keystore nunca se sube al repositorio (`*.jks`/`*.keystore` están en `.gitignore`).
- Descarga el APK y verifícalo:
  ```bash
  sha256sum ordyx-1.0.0.apk
  apksigner verify --print-certs ordyx-1.0.0.apk   # Android build-tools
  ```
- Instálalo en un dispositivo real (`adb install` o abriendo el archivo) y prueba registro, reproducción y segundo plano.
- Publicación desde el panel → **Versiones**:
  1. «Subir APK al bucket releases» (o aloja el APK en GitHub Releases si supera el límite de tu plan) — rellena tamaño, ruta y SHA-256.
  2. Completa versión, compilación, `min_os_version` = `7.0`, notas → «Guardar borrador».
  3. Marca «He instalado y abierto esta versión en un dispositivo real» → «Verificar» (el servidor recalcula el hash).
  4. «Publicar». La web lo mostrará en ≤1 min. Si aparece un fallo grave: «Retirar» con motivo; la web deja de ofrecerla al instante (y vuelve a la anterior publicada).

### Google Play (más adelante)
`npx eas-cli build --profile production --platform android` genera el AAB; `eas submit` lo sube. Necesitas una cuenta de Google Play Console (pago único) y cumplir sus requisitos de pruebas para cuentas nuevas y la declaración de seguridad de datos. Registra después en el panel una versión con método «Google Play» y el enlace de la ficha.

## iPhone/iPad

### Qué hemos comprobado (documentación oficial de Apple, octubre 2026)

**No se puede instalar una app en iPhone descargando un `.ipa` desde una web.** Las vías autorizadas son:

1. **App Store** — requiere Apple Developer Program y revisión de la app.
2. **TestFlight** — beta oficial. Un enlace público permite que cualquiera se una (hasta 10 000 probadores externos); la primera compilación para externos pasa una revisión beta de Apple; cada compilación caduca a los 90 días. Funciona en todo el mundo.
3. **Distribución web en la UE (Web Distribution, DMA)** — instalar desde tu propio dominio, **solo para usuarios de la UE** con iOS 17.5+ / iPadOS 18+. Requisitos según Apple ([Web Distribution in the EU](https://developer.apple.com/support/web-distribution-eu/)):
   - El *Account Holder* acepta la última licencia del programa y **solicita acceso**; Apple autoriza tras comprobar criterios y compromisos continuos (responder a Apple sobre fraude o seguridad, políticas de datos transparentes, cumplir DSA/RGPD/consumo, atender requerimientos oficiales).
   - **Criterio financiero (uno de):** exención de cuota (ONG, centro educativo o administración); puntuación D&B «Low/Below Average Risk»; cotizar en bolsa; financiación de un fondo de capital riesgo listado; carta de crédito *stand-by* de 1 000 000 USD; auditoría financiera de los últimos 3 años; o 2 años en el programa con una app de más de 1 millón de instalaciones anuales.
   - La app debe pasar la **notarización** de Apple; solo se instala desde un **dominio registrado** en App Store Connect, con los paquetes firmados que descargas de App Store Connect.
   - Tu servidor debe implementar los servicios de **MarketplaceKit**: `/.well-known/marketplace-kit` (endpoint de restauración), servidor de licencias con el *AppLicenseDeliverySDK* de Apple y, si exiges login, un servidor OAuth 2.0 (`/.well-known/oauth-authorization-server`). El botón de la web usa un esquema de URL especial de MarketplaceKit.
   - Comisión: «Core Technology Commission» del 5 % sobre ventas digitales asociadas (desde el 1 de octubre de 2026, Anexo 14 de la licencia).
   - El sistema muestra siempre su propia hoja de instalación y el usuario debe autorizar al desarrollador en Ajustes la primera vez: **no existe instalación silenciosa**.

**Conclusión:** para un proyecto nuevo sin esos requisitos financieros, la opción viable es **TestFlight → App Store**. El modelo de datos ya admite `web_distribution` como método para cuando Apple lo autorice; la implementación de los endpoints de MarketplaceKit queda pendiente de esa aprobación (necesita el SDK y los certificados que Apple entrega).

### Pasos (los hace el propietario; requieren cuenta Apple Developer)

1. Darse de alta en el **Apple Developer Program** (cuota anual) como persona física u organización (para organización hace falta número D-U-N-S).
2. Crear el App ID con el `IOS_BUNDLE_ID` definitivo y la ficha de la app en **App Store Connect** (nombre, privacidad —«nutrition labels»—, clasificación por edades, URL de soporte y de privacidad: `https://<tu-dominio>/privacidad`).
3. `npx eas-cli@latest build --profile production --platform ios` — EAS puede crear y gestionar certificados y perfiles de distribución si inicias sesión con tu Apple ID (o subes los tuyos). Nada de esto se guarda en el repositorio.
4. `npx eas-cli@latest submit --platform ios` → sube el IPA a App Store Connect.
5. TestFlight → grupo externo → enviar a revisión beta → activar **enlace público**.
6. Instalar desde ese enlace en un iPhone real y probar (registro, reproducción en segundo plano y pantalla de bloqueo).
7. Panel → Versiones: plataforma iOS, método «TestFlight», URL = enlace público, `min_os_version` = `15.1` → verificar → publicar. El botón «Instalar en iPhone» de la web usará ese enlace.
8. Cuando la app esté aprobada en el App Store, publica otra versión con método «App Store» y la URL de la ficha.

**No se ha generado ningún IPA ni certificado**: requieren tu cuenta de Apple Developer.

## Pruebas en dispositivos

- Android: `npx eas-cli build --profile development --platform android`, instala el APK y ejecuta `pnpm dev:mobile`.
- iOS: registra el dispositivo (`eas device:create`) y usa el perfil `development` o `preview`.
- Lista mínima: registro/login, cerrar sesión en todos los dispositivos, búsqueda, reproducción con pantalla apagada ≥5 min, llamada entrante durante la reproducción (debe pausar), desconectar auriculares, modo avión durante la reproducción (debe mostrar error y permitir reintentar), crear/reordenar playlist, subir una canción (cuenta artista), borrar cuenta.
