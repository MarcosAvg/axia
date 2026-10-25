# Operación

Guía para desplegar, actualizar y respaldar una instalación de Axia. La instalación inicial está en
[`../start/instalacion.md`](../start/instalacion.md).

## Arquitectura de despliegue

| Servicio | Función |
|---|---|
| `db` | PostgreSQL 17 con volumen persistente |
| `migrate` | Aplica migraciones y termina |
| `app` | API Fastify y SPA; volumen de evidencias |

El reverse proxy TLS es infraestructura de destino. Debe enrutar al servicio `app` en el puerto
`3100`, conservar las cabeceras de proxy y permitir el tamaño de las evidencias. La base no se
publica.

## Puesta en marcha en producción

```bash
cp .env.example .env
# Generar secretos y ajustar valores. No usar los valores de ejemplo.
chmod 600 .env
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
```

Comprobaciones:

```bash
docker compose ps
docker compose logs --tail=100 app
curl -fsS http://127.0.0.1:3100/api/health/ready
```

La primera cuenta se crea desde `/login` o con `POST /api/setup`. La contraseña debe tener al menos
12 caracteres.

## Actualización

```bash
git pull
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

## Limpieza de evidencias abandonadas

Una subida que nunca termina deja un archivo parcial en el volumen. La cuota se comprueba al iniciar
la subida, y este trabajo elimina los archivos parciales de más de 24 horas y marca la fila como
`failed`; las filas de evidencia nunca se borran (RN-22).

```bash
# En el contenedor, con las variables y el volumen del servicio app:
docker compose run --rm app node dist/evidence/cleanup-cli.js

# En local:
pnpm db:cleanup-evidence
```

`EVIDENCE_CLEANUP_HOURS` cambia el umbral (por defecto 24). Programarlo con cron o systemd junto con
los respaldos.

## Operación y mantenimiento

- Revisar logs, espacio en disco y salud del contenedor.
- Programar los respaldos y la limpieza de evidencias con cron o systemd.
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
