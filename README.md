# Ordyx — plataforma musical (nombre provisional)

Plataforma para escuchar música, crear playlists y descubrir artistas independientes que publican su propia música. Monorepo con:

| Carpeta | Qué es |
|---|---|
| `apps/mobile` | App Android/iOS (Expo SDK 58, Expo Router, TypeScript, `expo-audio`) |
| `apps/web` | Web pública de descarga e información (Next.js 16, Tailwind 4) |
| `apps/admin` | Panel de administración protegido (Next.js 16) |
| `services/transcoder` | Worker de transcodificación de audio (ffmpeg → AAC 128 kbps, −14 LUFS) |
| `packages/shared` | Marca, tipos, validación (zod), lógica de la cola de reproducción, utilidades |
| `supabase/` | Migraciones SQL con RLS, Edge Function, pruebas de seguridad, `config.toml` |
| `scripts/` | Pruebas de BD, prueba de humo de la API, iconos de marca, contenido demo |
| `docs/` | Arquitectura, despliegue, distribución móvil, administración, audio, legal, estado |

## Puesta en marcha rápida

```bash
corepack enable && pnpm install
cp apps/mobile/.env.example apps/mobile/.env        # y .env.local en web/admin
pnpm test && pnpm test:db                            # pruebas unitarias y de seguridad
pnpm dev:web | pnpm dev:admin | pnpm dev:mobile
```

Compilaciones: `pnpm build:web`, `pnpm build:admin`; app: `cd apps/mobile && npx eas-cli build --profile production-apk --platform android` (ver `docs/DISTRIBUCION_MOVIL.md`).

## Documentación

- [Estado del proyecto: hecho, probado, pendiente y bloqueado](docs/ESTADO.md)
- [Arquitectura y modelo de seguridad](docs/ARQUITECTURA.md)
- [Instalación y despliegue](docs/DESPLIEGUE.md)
- [Distribución Android e iOS (investigación de Apple incluida)](docs/DISTRIBUCION_MOVIL.md)
- [Guía de administración](docs/ADMINISTRACION.md)
- [Audio, almacenamiento, costes y CDN](docs/AUDIO_Y_STREAMING.md)
- [Requisitos legales a revisar](docs/LEGAL.md)
- [Lista de comprobación para producción](docs/CHECKLIST_PRODUCCION.md)

## Seguridad en una línea
Los clientes solo usan la clave **publicable**; todas las tablas tienen RLS; roles, estados y contadores no se pueden modificar desde el cliente; las acciones administrativas se validan en la base de datos y quedan auditadas. No hay secretos en el repositorio ni en las apps.
