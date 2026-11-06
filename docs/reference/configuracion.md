# Configuración

Variables de entorno del servidor y del compose. Los valores reales viven en `.env`, con permisos
`0600` y fuera del repositorio. La plantilla de producción es `.env.example`; la de desarrollo es
`.env.dev.example` y los valores ficticios de pruebas están en `.env.test.example`. Los comandos de
pruebas no descubren archivos privados.

## Cómo se aplica

Esta es la referencia de variables de Axia; las guías enlazan aquí en lugar de repetir tablas.
La sección «Servidor» muestra valores al ejecutar el proceso directamente. Compose fija o
construye algunos valores y solo entrega a los contenedores las variables declaradas en
`compose.yaml`: añadir una variable arbitraria al archivo `.env` no la entrega automáticamente.

Desarrollo usa `.env.dev` (o `AXIA_ENV_FILE`) y `compose.dev.yaml`; API y web se ejecutan en el host.
Pruebas usa `compose.test.yaml` y valores ficticios: no descubre archivos privados. La plantilla
`.env.test.example` no se carga automáticamente. Para los procedimientos, consultar
[Instalación](../../deploy/README.md), [Operación](../guides/operacion.md) y
[Desarrollo](../start/desarrollo.md).

## Producción mínima

`compose.yaml` necesita dos secretos. La imagen es opcional y usa `:latest` por defecto:

| Variable | Uso |
|---|---|
| `AXIA_IMAGE` | Opcional; `latest` por defecto. Fijar `vX.Y.Z` o un digest para producción reproducible |
| `POSTGRES_OWNER_PASSWORD` | Contraseña del rol dueño; obligatoria |
| `AXIA_APP_PASSWORD` | Contraseña del rol de la aplicación; obligatoria |

Generar ambos secretos con `openssl rand -hex 32`. Compose los inserta en las URLs de conexión;
usar solo hexadecimal evita que caracteres como `/`, `#`, `?` o `%` rompan la cadena.

El resto de variables tiene valores por defecto en `compose.yaml` o en el servidor. Se añaden a
`.env` solo cuando se necesita cambiar el comportamiento. El paquete usa `latest` por defecto y
`release.json` conserva el digest de la release. Para producción reproducible, fijar `AXIA_IMAGE`
con una etiqueta `vX.Y.Z` o el digest; `latest` es el canal de actualización continua. El rol
interno `axia_app` es fijo; `AXIA_APP_USER` no es una opción de despliegue.

## Base de datos

| Variable | Valor por defecto | Uso |
|---|---|---|
| `POSTGRES_DB` | `axia` | Nombre de la base |
| `POSTGRES_OWNER_USER` | `axia_owner` | Rol dueño; migración de arranque |
| `POSTGRES_OWNER_PASSWORD` | — | Obligatoria; secreto |
| `AXIA_APP_PASSWORD` | — | Obligatoria; secreto |
| `MIGRATION_DATABASE_URL` | — | La app la usa al arrancar; no queda en el proceso servidor |
| `DATABASE_URL` | — | Runtime del servidor y scripts del host; Compose construye la suya |
| `DB_PORT` | `5433` | Puerto loopback de `compose.dev.yaml`; ajustar también ambas URLs host |

En el contenedor `db`, Compose traduce `POSTGRES_OWNER_USER` a `POSTGRES_USER` y
`POSTGRES_OWNER_PASSWORD` a `POSTGRES_PASSWORD`; estos últimos son valores internos, no opciones
adicionales del archivo de instancia.

Compose de desarrollo fija base `axia_dev` y dueño `axia_owner`; no consume `POSTGRES_DB` ni
`POSTGRES_OWNER_USER`. Compose de pruebas fija base `axia_test`, dueño `axia_test_owner` y puerto
loopback `55433`, con almacenamiento desechable. Producción no publica PostgreSQL al host.

### Parámetros de PostgreSQL en producción

| Variable | Valor por defecto | Uso |
|---|---|---|
| `POSTGRES_SHARED_BUFFERS` | `256MB` | `shared_buffers` |
| `POSTGRES_EFFECTIVE_CACHE_SIZE` | `1GB` | `effective_cache_size` |
| `POSTGRES_WORK_MEM` | `8MB` | `work_mem` |
| `POSTGRES_MAINTENANCE_WORK_MEM` | `128MB` | `maintenance_work_mem` |
| `POSTGRES_MAX_CONNECTIONS` | `50` | `max_connections` |

Solo `compose.yaml` consume estos ajustes; `compose.dev.yaml` y `compose.test.yaml` no los aplican.
Producción fija además `track_io_timing=on`. Consultar
[Rendimiento](rendimiento-postgres.md) antes de ajustar valores.

## Servidor

Estos valores se entregan a app por Compose; los que indica «fijo» requieren cambiar la
definición de Compose para usar otro valor en el contenedor. Cambiar `PORT` en `.env` no cambia el
puerto interno de producción.

| Variable | Valor por defecto | Uso |
|---|---|---|
| `HOST` | `0.0.0.0` | Interfaz de escucha; fijo a este valor en producción |
| `PORT` | `3100` | Puerto HTTP; dentro de Compose es fijo `3100` |
| `NODE_ENV` | `development` | Compose fija `production`; desarrollo ejecuta los watchers del host con `development` |
| `LOG_LEVEL` | `info` | Nivel de registro |
| `TRUST_PROXY` | `false` en host | Fijo `true` en Compose de producción detrás del proxy |
| `BODY_LIMIT_BYTES` | `1048576` | Límite del cuerpo JSON |
| `HEALTH_TIMEOUT_MS` | `2000` | Timeout de salud |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Cierre ordenado |
| `STATIC_DIR` | — | Directorio del SPA; Compose fija `/app/web` |

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
| `STORAGE_DIR` | `./data/evidence`; `/data/evidence` en Compose; `apps/server/data/evidence` con `pnpm dev` / `dev:api` (o `AXIA_DEV_STORAGE_DIR`) |
| `EVIDENCE_MAX_BYTES` | `20971520` (20 MiB) |
| `EVIDENCE_MAX_DIMENSION` | `4096` |
| `EVIDENCE_THUMBNAIL_SIZE` | `320` |
| `EVIDENCE_QUOTA_BYTES` | `524288000` (500 MiB) |

## Adjuntos

Los adjuntos son documentos obligatorios de ciertos problemas. Comparten `STORAGE_DIR` con las
evidencias, pero se guardan y se cuentan aparte.

| Variable | Valor por defecto |
|---|---|
| `ATTACHMENT_MAX_BYTES` | `26214400` (25 MiB) |
| `ATTACHMENT_QUOTA_BYTES` | `524288000` (500 MiB) |
| `ATTACHMENT_CLEANUP_HOURS` | `24` |

## Tiempo real y sincronización

| Variable | Valor por defecto |
|---|---|
| `SSE_HEARTBEAT_MS` | `15000` |
| `SYNC_FUTURE_TOLERANCE_MS` | `300000` |
| `SYNC_MAX_AGE_MS` | `2592000000` |

## Red del proxy

| Variable | Valor por defecto | Uso |
|---|---|---|
| `AXIA_PROXY_NETWORK` | `proxy` | Red externa del proxy que debe existir antes del arranque |
| `AXIA_PROXY_ALIAS` | `axia` | Alias de la app; usar uno distinto entre instancias en la misma red |

## Limpieza

Se entregan por Compose a los trabajos operativos; su ejecución se programa según
[Operación](../guides/operacion.md#limpieza-y-retención).

| Variable | Valor por defecto | Uso |
|---|---|---|
| `EVIDENCE_CLEANUP_HOURS` | `24` | Antigüedad de subidas parciales |
| `RETENTION_SESSION_DAYS` | `30` | Retención de sesiones caducadas/revocadas |
| `RETENTION_LOGIN_ATTEMPT_DAYS` | `90` | Retención de intentos de acceso |
| `RETENTION_NOTIFICATION_DAYS` | `90` | Retención de avisos leídos |

Las opciones de sesiones, login y mantenimiento se entregan explícitamente al proceso por Compose.
No se pasa el archivo de entorno completo a la app: la contraseña del dueño permanece fuera de ella.

## Desarrollo y construcción web

Estas opciones se usan en el host, no se entregan al contenedor de producción.

| Variable | Valor por defecto | Uso |
|---|---|---|
| `AXIA_ENV_FILE` | `.env.dev` | Archivo para scripts de desarrollo; `/dev/null` excluye dotenv en pruebas |
| `AXIA_DEV_WEB_PORT` | `5173` | Puerto de Vite con `pnpm dev` |
| `AXIA_DEV_STORAGE_DIR` | `apps/server/data/evidence` | Directorio usado por `pnpm dev`; sustituye `STORAGE_DIR` |
| `AXIA_API_URL` | `http://127.0.0.1:3100` | Destino del proxy de Vite; `pnpm dev` lo genera desde `PORT` |
| `VITE_API_URL` | vacío | URL de API incorporada al construir la web; vacío usa el mismo origen |
| `AXIA_REACT_COMPILER` | desactivado en desarrollo | `1` activa el compilador en Vite; build ya lo activa |
| `AXIA_DEMO_PASSWORD` | generada si no se define | Solo local; reejecutar la semilla para reaplicarla a usuarios existentes |
| `AXIA_APP_USER` | `axia_app` | La migración de arranque rechaza cualquier otro valor; no es un rol configurable |

Con `pnpm dev`, `HOST` vale `127.0.0.1` por defecto. La plantilla `.env.dev.example` no modifica la
imagen de producción. No incluir secretos en variables `VITE_*`: se incorporan a la web.

## Pruebas y CI

| Variable | Valor por defecto | Uso |
|---|---|---|
| `MIGRATION_DATABASE_URL` | conexión ficticia de `compose.test.yaml` | Integración: loopback y base `_test`, sin parámetros ni fragmento |
| `AXIA_APP_PASSWORD` | `test-app-password` | Contraseña ficticia del rol de pruebas |
| `AXIA_E2E_MIGRATION_DATABASE_URL` | deriva `_e2e` de la URL `_test` | Base E2E explícita: loopback y sufijo `_e2e`, sin parámetros ni fragmento |
| `AXIA_DEMO_PASSWORD` | `E2ePassword123!` en E2E | Semilla ficticia de navegador |
| `AXIA_TEST_BASE` | `main` | Referencia Git de `pnpm test:affected` |
| `AXIA_TEST_FILES` | detectados por Git | Lista de rutas separadas por comas para `test:affected` |
| `CI` | sin definir | Playwright prohíbe `test.only` y permite dos reintentos cuando está presente |

El preparador E2E fija `NODE_ENV=test`, `PORT=3101`, `AXIA_ENV_FILE=/dev/null` y genera la URL de
app con el rol `axia_app`. Los valores ficticios son exclusivos del entorno desechable.

## Herramientas operativas

Estas opciones se exportan al ejecutar los scripts; no basta con añadirlas al archivo de entorno
de Compose. Las rutas de `AXIA_ENV_FILE` y `AXIA_COMPOSE_FILE` relativas se resuelven desde la raíz
de la instalación. `BACKUP_DIR` es relativo al directorio desde el que se invoca el script.

| Variable | Valor por defecto | Uso |
|---|---|---|
| `AXIA_ENV_FILE` | selección habitual de Compose | Archivo entregado con `--env-file` |
| `AXIA_COMPOSE_FILE` | selección habitual de Compose | Un archivo entregado con `-f`; prima sobre `COMPOSE_FILE` |
| `COMPOSE_FILE` | `compose.yaml` | Selección nativa de Compose; permite varios archivos |
| `COMPOSE_PROJECT_NAME` | `axia` en producción | Proyecto; determina contenedores y volúmenes |
| `BACKUP_DIR` | `./backups` | Destino de respaldos individuales y conjuntos |
| `RETENTION_DAYS` | `14` | Solo respaldos individuales: borra archivos antiguos después de copiar correctamente |
| `DB_CONTAINER` | servicio `db` si no hay `DATABASE_URL` | Contenedor de base para `backup.sh` / `restore.sh` |
| `PGUSER` | `axia_owner` | Rol para scripts individuales con contenedor |
| `PGDATABASE` | `axia` | Base para scripts individuales con contenedor |
| `DATABASE_URL` | sin valor | Alternativa con herramientas PostgreSQL del host en scripts individuales |
| `EVIDENCE_VOLUME` | volumen del servicio app | Volumen explícito para scripts individuales de evidencias |
| `AXIA_IMAGE` | imagen de app en Compose | Coordinadores: imagen de app; volumen explícito: imagen del auxiliar |
| `AXIA_APP_IMAGE` | sin valor | Compatibilidad: alternativa a `AXIA_IMAGE` solo con `EVIDENCE_VOLUME` |

Los coordinadores usan las credenciales internas de `db`; no usan `PGUSER`, `PGDATABASE` ni
`DATABASE_URL` del host. No imprimir `docker compose config` completo: puede revelar secretos.
La rotación de contraseñas requiere cambiar también los roles existentes, según
[Operación](../guides/operacion.md#secretos-y-rotación).
