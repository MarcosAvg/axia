# Operación

Guía para desplegar, actualizar y respaldar una instalación de Axia. La instalación inicial está en
[`../start/instalacion.md`](../start/instalacion.md).

## Arquitectura de despliegue

| Servicio | Función |
|---|---|
| `db` | PostgreSQL 17 con volumen persistente |
| `migrate` | Aplica migraciones y termina |
| `app` | API Fastify y SPA; volumen de evidencias |

Axia no incluye reverse proxy: el TLS y el enrutamiento de borde son infraestructura de destino. La
base no se publica nunca. El servicio `app` escucha en `3100` y ya sirve el SPA, su fallback y las
cabeceras de caché; el proxy solo tiene que reenviar todo a `app`, sin servir estáticos por su
cuenta. Si publicas en loopback, apunta a `127.0.0.1:3100`, no a `localhost`, que puede resolverse
a IPv6.

## Puesta en marcha en producción

```bash
cp .env.example .env
# Generar secretos y ajustar valores. No usar los valores de ejemplo.
chmod 600 .env

# Solo si el proxy corre en el mismo host: publica app en 127.0.0.1.
export COMPOSE_FILE=compose.yaml:compose.publish.yaml

docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
```

Si el proxy es otro contenedor, no exportes `compose.publish.yaml`: únelo a la red de Compose y
apunta a `app:3100`.

Comprobaciones:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1))"
# Solo con compose.publish.yaml:
curl -fsS http://127.0.0.1:3100/api/health/ready
```

La primera cuenta se crea desde `/login` o con `POST /api/setup`. La contraseña debe tener al menos
12 caracteres.

## Reverse proxy

El proxy debe cumplir este contrato:

- **TLS en el borde.** Las cookies de sesión son `Secure` en producción; sin HTTPS el navegador no
  las envía.
- **Cabeceras.** Conservar `Host` y `Origin`, y reenviar `X-Forwarded-Proto`, `X-Forwarded-Host` y
  `X-Forwarded-For`. Si el proxy reescribe `Host`, `X-Forwarded-Host` debe llevar el dominio
  público.
- **`TRUST_PROXY=true`.** Es obligatorio cuando el proxy termina TLS: el guard de origen compara
  `Origin` con el protocolo y el host de la petición. Actívalo solo si la única vía a `app` es el
  proxy (loopback o red privada); nunca si `app` está expuesta directamente.
- **Tamaño de subida.** El límite del proxy debe superar `EVIDENCE_MAX_BYTES` (20 MiB por defecto)
  con margen. Las subidas usan TUS en `/api/uploads` y necesitan `PATCH`, `HEAD` y `OPTIONS`.
- **SSE.** `/api/events` es `text/event-stream`: desactiva el buffering y usa un timeout mayor que
  `SSE_HEARTBEAT_MS` (15 s por defecto). No hace falta WebSocket.
- **Caché.** No pises las cabeceras de la app: `index.html` y el service worker van con `no-cache`;
  `/assets/*` con caché inmutable.
- **Cookies.** Deja pasar `Cookie` y `Set-Cookie` sin reescribir dominio ni ruta.
- **Salud.** `/api/health/ready` responde 503 hasta que la base está lista; úsalo si el proxy hace
  comprobaciones propias.

## Actualización

```bash
git pull
# Repite el export si el proxy está en el host:
export COMPOSE_FILE=compose.yaml:compose.publish.yaml
docker compose build
docker compose run --rm migrate
docker compose up -d app
```

La compuerta de calidad se ejecuta antes de desplegar:

```bash
pnpm check
```

## Respaldos

### Base de datos

```bash
mkdir -p /var/backups/axia
BACKUP_DIR=/var/backups/axia RETENTION_DAYS=14 ./deploy/scripts/backup.sh
```

El script detecta el contenedor `db` del Compose del repositorio. También acepta `DB_CONTAINER` o
`DATABASE_URL`. Usa `pg_dump -Fc`; no se copia en caliente el directorio de datos.

### Evidencias

```bash
BACKUP_DIR=/var/backups/axia ./deploy/scripts/backup-evidence.sh
```

Respalda el volumen de fotos y miniaturas. Debe ejecutarse junto con el respaldo de la base:
restaurar solo uno deja registros sin archivos o archivos sin registros.

### Restauración

1. Detener la API:

   ```bash
   docker compose stop app
   ```

2. Restaurar la base en una base de destino. Para una prueba, usar una base desechable:

   ```bash
   DB_CONTAINER="$(docker compose ps -q db)" PGDATABASE=axia_restore_test \
     ./deploy/scripts/restore.sh /var/backups/axia/axia-<fecha>.dump
   ```

3. Restaurar las evidencias si corresponde:

   ```bash
   ./deploy/scripts/restore-evidence.sh /var/backups/axia/axia-evidence-<fecha>.tgz
   ```

4. Levantar la API y comprobar salud, login y un tiquet con evidencia.

La prueba de restauración se realiza al montar el servidor y después cada trimestre. El criterio de
éxito es que la aplicación abra con los datos restaurados y que los conteos de tiquets, eventos y
evidencias coincidan con el origen.

## Limpieza y retención

Una subida que nunca termina deja un archivo parcial en el volumen. La cuota se comprueba al iniciar
la subida, y este trabajo elimina los archivos parciales de más de 24 horas y marca la fila como
`failed`; las filas de evidencia nunca se borran (RN-22).

La retención borra sesiones caducadas o revocadas, intentos de acceso y avisos ya leídos. Los avisos
sin leer y la bitácora de tiquets se conservan.

```bash
# Ambas tareas, con la pila levantada:
./deploy/scripts/cleanup.sh

# Por separado, en el contenedor:
docker compose run --rm app node dist/evidence/cleanup-cli.js
docker compose run --rm app node dist/maintenance/cleanup-cli.js

# En local:
pnpm db:cleanup-evidence
pnpm db:cleanup
```

Umbrales (días): `EVIDENCE_CLEANUP_HOURS` (24 horas), `RETENTION_SESSION_DAYS` (30),
`RETENTION_LOGIN_ATTEMPT_DAYS` (90) y `RETENTION_NOTIFICATION_DAYS` (90). Programar con cron junto
con los respaldos:

```cron
0 3 * * * cd /opt/axia && ./deploy/scripts/cleanup.sh >> /var/log/axia-cleanup.log 2>&1
```

## Operación y mantenimiento

- Revisar logs, espacio en disco y salud del contenedor.
- Programar los respaldos, la limpieza y la retención con cron o systemd.
- Mantener `.env` fuera del repositorio y con permisos `0600`.
- Rotar contraseñas de base y aplicación cuando corresponda; reiniciar `app` después.
- No añadir PgBouncer ni particiones sin medición previa. El pool de la aplicación está limitado a
  10 conexiones y `LISTEN/NOTIFY` usa una conexión dedicada.
- Revisar [`../reference/rendimiento-postgres.md`](../reference/rendimiento-postgres.md) antes de
  cambiar índices o parámetros.

## Secretos

| Variable | Rotación |
|---|---|
| `POSTGRES_OWNER_PASSWORD` | Cambiar el rol dueño y actualizar `MIGRATION_DATABASE_URL` |
| `AXIA_APP_PASSWORD` | Cambiar el rol de aplicación, actualizar `DATABASE_URL` y reiniciar `app` |
| `AXIA_DEMO_PASSWORD` | Solo demo local; nunca en producción |

Nunca se versionan `.env`, dumps ni el volumen de evidencias.
