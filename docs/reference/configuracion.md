# Configuración

Variables de entorno del servidor y del compose. Los valores reales viven en `.env`, con permisos
`0600` y fuera del repositorio. La plantilla está en `.env.example`.

## Base de datos

| Variable | Valor por defecto | Uso |
|---|---|---|
| `POSTGRES_DB` | `axia` | Nombre de la base |
| `POSTGRES_OWNER_USER` | `axia_owner` | Rol dueño; solo migraciones |
| `POSTGRES_OWNER_PASSWORD` | — | Obligatoria; secreto |
| `AXIA_APP_USER` | `axia_app` | Rol de la aplicación |
| `AXIA_APP_PASSWORD` | — | Obligatoria; secreto |
| `MIGRATION_DATABASE_URL` | — | Conexión del runner de migraciones |
| `DATABASE_URL` | — | Conexión del servidor |
| `DB_PORT` | `5433` | Puerto local de PostgreSQL |

## Servidor

| Variable | Valor por defecto | Uso |
|---|---|---|
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `PORT` | `3100` | Puerto HTTP |
| `APP_PORT` | `3100` | Puerto publicado en desarrollo |
| `NODE_ENV` | `development` | `production` en producción |
| `LOG_LEVEL` | `info` | Nivel de registro |
| `TRUST_PROXY` | `false` | Activar solo detrás de un proxy de confianza |
| `BODY_LIMIT_BYTES` | `1048576` | Límite del cuerpo JSON |
| `HEALTH_TIMEOUT_MS` | `2000` | Timeout de salud |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Cierre ordenado |
| `STATIC_DIR` | — | Directorio del SPA; `/app/web` en la imagen |
| `VITE_API_URL` | vacío | URL de API para la web; vacío usa el mismo origen |

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
