# Configuración

Variables de entorno del servidor y del compose. Los valores reales viven en `.env`, con permisos
`0600` y fuera del repositorio. La plantilla de producción es `.env.example`; la de desarrollo es
`.env.dev.example` y los valores ficticios de pruebas están en `.env.test.example`. Los comandos de
pruebas no descubren archivos privados.

## Producción mínima

`compose.yaml` exige una imagen de release y dos secretos:

| Variable | Uso |
|---|---|
| `AXIA_IMAGE` | Referencia exacta de la release (tag o digest); misma para app y migrador |
| `POSTGRES_OWNER_PASSWORD` | Contraseña del rol dueño; obligatoria |
| `AXIA_APP_PASSWORD` | Contraseña del rol de la aplicación; obligatoria |

El resto de variables tiene valores por defecto en `compose.yaml` o en el servidor. Se añaden a
`.env` solo cuando se necesita cambiar el comportamiento. El paquete de release fija `AXIA_IMAGE`
por digest. No se debe usar `latest` para actualizar una instancia con datos reales sin seleccionar y verificar la versión. El rol interno `axia_app` es
fijo; `AXIA_APP_USER` no es una opción de despliegue.

## Base de datos

| Variable | Valor por defecto | Uso |
|---|---|---|
| `POSTGRES_DB` | `axia` | Nombre de la base |
| `POSTGRES_OWNER_USER` | `axia_owner` | Rol dueño; solo migraciones |
| `POSTGRES_OWNER_PASSWORD` | — | Obligatoria; secreto |
| `AXIA_APP_PASSWORD` | — | Obligatoria; secreto |
| `MIGRATION_DATABASE_URL` | — | Solo scripts del host; Compose construye la suya |
| `DATABASE_URL` | — | Solo scripts del host; Compose construye la suya |
| `DB_PORT` | `5433` | Solo desarrollo local; producción no publica la base |

## Servidor

| Variable | Valor por defecto | Uso |
|---|---|---|
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `PORT` | `3100` | Puerto HTTP; dentro de Compose es fijo `3100` |
| `APP_PORT` | `3100` | Alias histórico; desarrollo host usa `PORT` |
| `NODE_ENV` | `development` | Compose fija `production`; desarrollo ejecuta los watchers del host con `development` |
| `LOG_LEVEL` | `info` | Nivel de registro |
| `TRUST_PROXY` | `false` en host | Fijo `true` en Compose de producción detrás del proxy |
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

## Red y mantenimiento

| Variable | Valor por defecto | Uso |
|---|---|---|
| `AXIA_PROXY_NETWORK` | `proxy` | Red externa del proxy que debe existir antes del arranque |
| `AXIA_PROXY_ALIAS` | `axia` | Alias de la app; usar uno distinto entre instancias en la misma red |
| `EVIDENCE_CLEANUP_HOURS` | `24` | Antigüedad de subidas parciales |
| `RETENTION_SESSION_DAYS` | `30` | Retención de sesiones caducadas/revocadas |
| `RETENTION_LOGIN_ATTEMPT_DAYS` | `90` | Retención de intentos de acceso |
| `RETENTION_NOTIFICATION_DAYS` | `90` | Retención de avisos leídos |

Las opciones de sesiones, login y mantenimiento se entregan explícitamente al proceso por Compose.
No se pasa el archivo de entorno completo a la app: la contraseña del dueño permanece fuera de ella.

## Entornos locales

Desarrollo usa `.env.dev` (o `AXIA_ENV_FILE` explícito), `compose.dev.yaml`, base `axia_dev` y
puertos `5433`/`3100`/`5173`. `PORT` cambia la API y `AXIA_DEV_WEB_PORT` cambia Vite. Cambiar `DB_PORT`
requiere ajustar también las dos URLs locales; el instalador lo hace al generar el archivo.
Pruebas usa `compose.test.yaml`, puerto `55433` y base `axia_test`. `MIGRATION_DATABASE_URL` permite
seleccionar otro servidor loopback de pruebas; `AXIA_E2E_MIGRATION_DATABASE_URL` permite elegir una
base `_e2e` explícita. Ninguna admite parámetros en la URL que puedan sustituir host o destino.
