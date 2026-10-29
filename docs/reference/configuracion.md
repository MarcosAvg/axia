# Configuración

Variables de entorno del servidor y del compose. Los valores reales viven en `.env`, con permisos
`0600` y fuera del repositorio. La plantilla de producción es `.env.example`; la de desarrollo y
pruebas es `.env.dev.example`.

## Producción mínima

`compose.yaml` solo exige dos secretos y el modo de proxy:

| Variable | Uso |
|---|---|
| `POSTGRES_OWNER_PASSWORD` | Contraseña del rol dueño; obligatoria |
| `AXIA_APP_PASSWORD` | Contraseña del rol de la aplicación; obligatoria |
| `TRUST_PROXY` | `true` si hay un proxy TLS delante |
| `APP_PORT` | Opcional; puerto de loopback, `3100` por defecto |
| `PROXY_NETWORK` | Opcional; red compartida con el proxy, `proxy` por defecto |
| `AXIA_VERSION` | Opcional; `latest` o un SHA de GHCR |

El resto de variables tiene valores por defecto en `compose.yaml` o en el servidor. Se añaden a
`.env` solo cuando se necesita cambiar el comportamiento.

## Base de datos

| Variable | Valor por defecto | Uso |
|---|---|---|
| `POSTGRES_DB` | `axia` | Nombre de la base |
| `POSTGRES_OWNER_USER` | `axia_owner` | Rol dueño; solo migraciones |
| `POSTGRES_OWNER_PASSWORD` | — | Obligatoria; secreto |
| `AXIA_APP_USER` | `axia_app` | Rol de la aplicación |
| `AXIA_APP_PASSWORD` | — | Obligatoria; secreto |
| `MIGRATION_DATABASE_URL` | — | Solo scripts del host; Compose construye la suya |
| `DATABASE_URL` | — | Solo scripts del host; Compose construye la suya |
| `DB_PORT` | `5433` | Solo desarrollo local; producción no publica la base |

## Servidor

| Variable | Valor por defecto | Uso |
|---|---|---|
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `PORT` | `3100` | Puerto HTTP fuera de Compose; dentro es fijo `3100` |
| `APP_PORT` | `3100` | Puerto de loopback que publica `compose.yaml` |
| `PROXY_NETWORK` | `proxy` | Red compartida con el reverse proxy |
| `AXIA_VERSION` | `latest` | Imagen de GHCR: `latest` o un SHA |
| `NODE_ENV` | `development` | Compose fija `production`; el overlay de desarrollo usa `development` |
| `LOG_LEVEL` | `info` | Nivel de registro |
| `TRUST_PROXY` | `false` | Obligatorio con proxy TLS; solo si `app` no está expuesta directamente |
| `BODY_LIMIT_BYTES` | `1048576` | Límite del cuerpo JSON |
| `HEALTH_TIMEOUT_MS` | `2000` | Timeout de salud |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Cierre ordenado |
| `STATIC_DIR` | — | Directorio del SPA; Compose fija `/app/web` |
| `VITE_API_URL` | vacío | Variable de build; vacío usa el mismo origen |

## Sesiones y acceso

| Variable | Valor por defecto |
|---|---|
| `SESSION_COOKIE_NAME` | `axia_session` |
| `SESSION_ABSOLUTE_TTL_HOURS` | `168` |
| `SESSION_IDLE_TTL_HOURS` | `24` |
| `SESSION_TOUCH_INTERVAL_SECONDS` | `60` |
| `LOGIN_MAX_ATTEMPTS` | `5` |
| `LOGIN_MAX_IP_ATTEMPTS` | `20` |
| `LOGIN_WINDOW_MINUTES` | `15` |
| `PASSWORD_MIN_LENGTH` | `12` |

## Evidencias

| Variable | Valor por defecto |
|---|---|
| `STORAGE_DIR` | `./data/evidence`; `/data/evidence` en Compose; `apps/server/data/evidence` con `pnpm dev:api` (o `AXIA_DEV_STORAGE_DIR`) |
| `EVIDENCE_MAX_BYTES` | `20971520` (20 MiB) |
| `EVIDENCE_MAX_DIMENSION` | `4096` |
| `EVIDENCE_THUMBNAIL_SIZE` | `320` |
| `EVIDENCE_QUOTA_BYTES` | `524288000` (500 MiB) |

## Tiempo real y sincronización

| Variable | Valor por defecto |
|---|---|
| `SSE_HEARTBEAT_MS` | `15000` |
| `SYNC_FUTURE_TOLERANCE_MS` | `300000` |
| `SYNC_MAX_AGE_MS` | `2592000000` |

## Demo

| Variable | Uso |
|---|---|
| `AXIA_DEMO_PASSWORD` | Contraseña de la semilla demo; solo local |

Al cambiarla, vuelve a ejecutar la semilla demo para reaplicarla a los usuarios existentes.

Las contraseñas de base, aplicación y demo nunca se versionan ni se imprimen en producción.
