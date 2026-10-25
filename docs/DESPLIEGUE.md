# Instalación, desarrollo y despliegue

## Requisitos
Node.js ≥ 22, pnpm 10 (`corepack enable`), PostgreSQL ≥ 15 solo para las pruebas de base de datos locales, Python 3 + Pillow solo para regenerar iconos.

## Desarrollo local

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env      # rellena la clave publicable
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local

pnpm dev:mobile   # Expo (Expo Go no incluye todo: usa un development build para audio en segundo plano)
pnpm dev:web      # http://localhost:3000
pnpm dev:admin    # http://localhost:3001 (añade -p 3001 si ambos corren a la vez)
```

## Pruebas y calidad

```bash
pnpm test           # shared (vitest), mobile (jest-expo)
pnpm test:db        # migraciones + ~100 pruebas de seguridad RLS en un PostgreSQL efímero
pnpm typecheck
pnpm lint
SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… bash scripts/smoke-api.sh   # prueba de humo contra la API real
pnpm --filter mobile export:android   # comprueba que el bundle de la app compila
pnpm build:web && pnpm build:admin
```

## Supabase

1. **Migraciones.** Con la CLI: `supabase link --project-ref <ref>` y `supabase db push`. En ORDIX ya están aplicadas 0001–0012 (aplicadas por MCP/SQL Editor, con versiones de registro distintas a los nombres de archivo; antes de usar `db push` ejecuta `supabase migration repair` para marcarlas como aplicadas).
2. **Edge Functions:** `supabase functions deploy delete-account` (ya desplegada en ORDIX).
3. **Auth** (panel → Authentication):
   - *URL Configuration*: Site URL `https://<tu-dominio>`; Redirect URLs: `ordyx://reset-password`, `https://<tu-dominio>/cuenta-confirmada`.
   - Confirmación de correo activada; **SMTP propio** (el SMTP por defecto de Supabase tiene límites muy bajos para producción).
   - Activar *Leaked password protection* (aviso actual del Security Advisor).
   - Plantillas de correo en español.
4. **Storage:** revisa el límite global de tamaño de archivo (Free: 50 MB).
5. **Primer administrador:** ver `ADMINISTRACION.md`.
6. **Contenido demo (opcional):** `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… pnpm seed:demo` (y `-- --remove` para borrarlo). Ejecútalo en tu máquina: la clave service_role no debe salir de ella.

## Worker de audio
Ver `AUDIO_Y_STREAMING.md` → Transcodificación (`services/transcoder`, imagen Docker incluida).

## Web y panel (Vercel u otro hosting Node)

- Proyecto 1: raíz `apps/web`, variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`. Dominio público (p. ej. `ordyx.app`).
- Proyecto 2: raíz `apps/admin`, mismas claves públicas. Dominio separado (p. ej. `admin.ordyx.app`).
- Comando de instalación en monorepo: `pnpm install --frozen-lockfile`; build: `pnpm --filter web build` / `pnpm --filter admin build`.

## App móvil
Ver `DISTRIBUCION_MOVIL.md`.
