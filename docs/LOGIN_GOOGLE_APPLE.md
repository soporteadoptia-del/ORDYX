# Inicio de sesión con Google y Apple

La app (Android e iPhone) y el panel de administración permiten entrar con **Google**. En iPhone
también aparece **Iniciar sesión con Apple**: Apple lo exige (App Store, norma 4.8) en cualquier app
que ofrezca un inicio de sesión de terceros como Google.

Todo pasa por **Supabase Auth**; la app y el panel no guardan ninguna clave secreta. El secreto de
Google solo se pega en el panel de Supabase.

## Cómo funciona

| Dónde | Flujo | Vuelta |
|---|---|---|
| App (Android/iOS) | `signInWithOAuth` + navegador del sistema (`expo-web-browser`) | `aurevix://auth-callback#access_token=…` |
| App (iPhone, Apple) | Botón nativo de Apple → `signInWithIdToken` con nonce | Sin redirección |
| Panel | `signInWithOAuth` (PKCE, cookies) | `https://<panel>/auth/callback?code=…` |

- La primera vez se crea el perfil automáticamente: el nombre visible sale del nombre de la cuenta
  de Google (o de Apple) y el nombre de usuario del correo (`aurevixweb@gmail.com` → `aurevixweb`), si
  está libre; si no, se genera uno provisional que se puede cambiar en el perfil.
- Como no pasan por el formulario de registro, las cuentas de Google/Apple ven una pantalla
  **«Un último paso»** para aceptar las condiciones y la privacidad (`accept_terms()`, queda la fecha).
- El panel solo deja pasar a cuentas con rol `admin` o `moderator`; cualquier otra cuenta se
  desconecta y vuelve al login con un aviso.

## 1. Google Cloud (una vez)

1. Entra en <https://console.cloud.google.com/> con `aurevixweb@gmail.com` y crea un proyecto
   (por ejemplo «Aurevix Music»). Si ya usas uno para aurevixweb.es puedes reutilizarlo.
2. **Google Auth Platform → Branding** (pantalla de consentimiento): nombre «Aurevix Music», correo de
   asistencia `aurevixweb@gmail.com`, logotipo (`apps/web/public/brand/icon-512.png`), dominio
   autorizado `supabase.co` y el de la web, y enlaces a `/privacidad` y `/condiciones` de la web.
   Tipo de usuario **Externo**. Publica la app (si queda en «Pruebas», solo entran los correos de prueba).
3. **Clients → Create client** → tipo **Aplicación web**:
   - *Orígenes de JavaScript autorizados*: `https://ordyx.vercel.app` (y tu dominio cuando lo tengas).
   - *URI de redirección autorizados*: `https://tqeradkfojhojwbvryob.supabase.co/auth/v1/callback`
4. Copia el **ID de cliente** y el **secreto de cliente**.

> Un solo cliente «Aplicación web» sirve para la app y el panel, porque quien habla con Google es
> Supabase, no la app.

## 2. Supabase → Authentication

1. **Sign In / Providers → Google**: actívalo y pega el ID de cliente y el secreto. Guarda.
2. **URL Configuration → Redirect URLs**: añade
   - `aurevix://auth-callback` (app)
   - `aurevix://reset-password` (app, ya estaba)
   - `https://<dominio-del-panel>/auth/callback` (panel; p. ej. `https://ordyx-admin.vercel.app/auth/callback`)
   - Para el desarrollo con Expo Go añade también `exp://**`.
3. **Apple** (solo para iPhone): **Sign In / Providers → Apple**, actívalo y en *Client IDs* pon el
   identificador del paquete iOS: `es.aurevixweb.music`. Para el botón nativo no hace falta secreto.
   En la cuenta de Apple Developer, el identificador `es.aurevixweb.music` debe tener activada la
   capacidad **Sign in with Apple** (EAS la activa al compilar si tienes la sesión de Apple iniciada).

## 3. Hacer administrador a aurevixweb@gmail.com

1. Entra una vez en la app o en el panel con **Continuar con Google** usando `aurevixweb@gmail.com`
   (en el panel verás «Tu cuenta no tiene permisos»: es normal, aún no tiene rol).
2. En Supabase → SQL Editor ejecuta:

   ```sql
   select public.bootstrap_first_admin('aurevixweb@gmail.com');
   ```

   Solo funciona mientras no exista ningún administrador. Después, los roles se gestionan desde el
   panel (Usuarios).

## Comprobación

- App: pantalla de inicio → «Continuar con Google» → eliges la cuenta → vuelves a la app con la sesión
  iniciada (la primera vez, pantalla «Un último paso»).
- Panel: `/login` → «Continuar con Google» → entras al panel si la cuenta es administradora.
- Errores típicos:
  - `redirect_uri_mismatch` (Google): falta la URI `…supabase.co/auth/v1/callback` en el cliente de Google.
  - Vuelves a la web en lugar de a la app: falta `aurevix://auth-callback` en *Redirect URLs* de Supabase
    (Supabase usa la *Site URL* si la dirección pedida no está en la lista).
  - «Unsupported provider»: el proveedor no está activado en Supabase.
