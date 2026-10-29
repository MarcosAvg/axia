# Operación

Guía para desplegar, actualizar y respaldar una instalación de Axia. La instalación inicial está en
[`../start/instalacion.md`](../start/instalacion.md).

## Arquitectura de despliegue

| Servicio | Función |
|---|---|
| `db` | PostgreSQL 17 con volumen persistente |
| `migrate` | Aplica migraciones y termina |
| `app` | API Fastify y SPA; volumen de evidencias |

Axia no incluye reverse proxy ni túnel. La base no se publica y `app` no abre puertos en el host:
queda solo en la red Docker `proxy` como `axia:3100`. Nginx Proxy Manager o Cloudflare Tunnel se
configuran fuera de este compose y se encargan de TLS. El compose fija `TRUST_PROXY=true` porque la
única vía de entrada es ese proxy.

## Puesta en marcha

```bash
cp .env.example .env
# Completar POSTGRES_OWNER_PASSWORD y AXIA_APP_PASSWORD. No usar valores de ejemplo.
chmod 600 .env
docker compose up -d
```

Compose descarga las imágenes de GHCR, arranca `db`, ejecuta `migrate` y arranca `app` cuando la
migración termina. No hay que construir imágenes en el servidor.

Comprobaciones:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1))"
```

La primera cuenta se crea desde `/login` a través del dominio ya publicado, o con `POST /api/setup`.
La contraseña debe tener al menos 12 caracteres.

## Nginx Proxy Manager

Axia crea la red `proxy`. Conecta el contenedor de NPM a esa red y crea un **Proxy Host**:

- Scheme: `http`.
- Forward Hostname: `axia`.
- Forward Port: `3100`.
- SSL: Let's Encrypt y **Force SSL**.

No hace falta configuración avanzada. NPM ya permite cuerpos de hasta 2000 MB, usa un timeout de
90 s y reenvía `X-Forwarded-For`/`X-Forwarded-Proto`. Axia envía `X-Accel-Buffering: no` para SSE.
Si el SSE se queda cargando, agrega `proxy_buffering off;` en Advanced. No necesitas WebSockets.

Los detalles para conectar NPM a la red están en [`../../deploy/README.md`](../../deploy/README.md).

## Cloudflare Tunnel

Axia no incluye `cloudflared`. El túnel lo ejecuta quien despliega, conectado a la red `proxy`. En
Cloudflare, el **Service URL** debe ser `http://axia:3100`.

- No hace falta abrir puertos ni configurar un certificado de origen.
- Cloudflare termina TLS y reenvía `X-Forwarded-Proto` y `X-Forwarded-For`.
- El límite gratuito de subida es 100 MB; Axia usa 20 MiB por evidencia.
- SSE funciona sin configuración adicional.
- El `TUNNEL_TOKEN` pertenece a `cloudflared`, no al `.env` de Axia.

## Actualización

```bash
docker compose pull
docker compose up -d
```

Compose recrea `migrate` si cambió la imagen y aplica las migraciones antes de arrancar `app`. Para
ver el resultado:

```bash
docker compose logs migrate
```

Antes de publicar una nueva imagen, la compuerta de calidad se ejecuta en el repositorio:

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

Respalda el volumen de fotos y miniaturas. Usa la imagen del contenedor `app`; también acepta
`AXIA_APP_IMAGE`. Debe ejecutarse junto con el respaldo de la base: restaurar solo uno deja registros
sin archivos o archivos sin registros.

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
| `POSTGRES_OWNER_PASSWORD` | Cambiar el rol dueño y actualizar `.env` |
| `AXIA_APP_PASSWORD` | Cambiar el rol de aplicación, actualizar `.env` y reiniciar `app` |
| `AXIA_DEMO_PASSWORD` | Solo demo local; nunca en producción |

Nunca se versionan `.env`, dumps ni el volumen de evidencias.
