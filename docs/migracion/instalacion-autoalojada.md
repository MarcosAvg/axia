# Instalación autoalojada y respaldos

**Estado:** disponible para el stack nuevo (`db` + `migrate` + `app`). La web sigue en el corte final;
hasta entonces este documento describe la API y la base, no publica el SPA.

## 1. Requisitos

- Linux con Docker Engine y Docker Compose v2.
- `openssl` para generar secretos.
- Un dominio y un reverse proxy TLS para producción (fuera de este repositorio).

La base **no** se publica en producción. En desarrollo, `compose.dev.yaml` publica la base y la API
solo en `127.0.0.1`.

## 2. Instalación local guiada

Desde la raíz del repositorio:

```bash
./scripts/install.sh            # instala sin demo
./scripts/install.sh --demo     # instala y carga la semilla de demostración
```

El script:

1. Comprueba Docker, Compose y `openssl`.
2. Se niega a sobrescribir un `.env` existente.
3. Genera `POSTGRES_OWNER_PASSWORD` y `AXIA_APP_PASSWORD` con 32 bytes aleatorios y escribe `.env`
   con permisos `0600`. No imprime los secretos.
4. Construye las imágenes, levanta `db`, aplica `migrate` y levanta `app`.
5. Espera a `GET /api/health/ready`.
6. Si se pide `--demo`, ejecuta la semilla demo; requiere conexión local y no usa contraseña fija.

La API queda en `http://127.0.0.1:3000` (o `APP_PORT`).

### Primer administrador

La instalación no crea un administrador automáticamente:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/setup \
  -H 'content-type: application/json' \
  -d '{"username":"admin","fullName":"Administrador","password":"<tu-contraseña>"}'
```

La contraseña debe tener al menos 12 caracteres. El primer arranque es de una sola vez; después se
usan `/api/auth/login` y la administración de usuarios.

## 3. Instalación manual

```bash
cp .env.example .env
# Editar .env: reemplazar CHANGE_ME y las URLs de MIGRATION_DATABASE_URL/DATABASE_URL.
# Generar secretos, por ejemplo: openssl rand -hex 32
chmod 600 .env
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
```

En producción no uses `compose.dev.yaml`: no publica puertos. El reverse proxy debe alcanzar la API
por la red interna de Compose (servicio `app`, puerto `3000`) o mediante un overlay de infraestructura.
Define `TRUST_PROXY=true` solo si el proxy reenvía `X-Forwarded-*` y está en una red de confianza.

La API tarda en arrancar hasta que `migrate` termina; `depends_on` lo garantiza. Si cambias una
migración o una variable, reconstruye y vuelve a ejecutar `migrate`.

## 4. Semilla de demostración

Solo en local o en una instalación de prueba:

```bash
pnpm db:next:demo -- --demo
```

La demo crea seis tiquets, usuarios y catálogos ficticios. No se ejecuta al migrar, no se aplica en
producción y no sobrescribe contraseñas existentes salvo que se pase `--reset-passwords`. Ver
`docs/decisions/0076-semillas-referencia-y-demo.md`.

## 5. Respaldos

### Base de datos

```bash
mkdir -p /var/backups/axia
BACKUP_DIR=/var/backups/axia RETENTION_DAYS=14 ./deploy/scripts/backup.sh
```

El script detecta el contenedor `db` del Compose del repositorio. También acepta `DB_CONTAINER` o
`DATABASE_URL` para una base externa. Usa `pg_dump -Fc`, no una copia en caliente del directorio de
datos.

### Evidencias

```bash
BACKUP_DIR=/var/backups/axia ./deploy/scripts/backup-evidence.sh
```

Respalda el volumen `axia_axia_evidence` (fotos y miniaturas). Debe ejecutarse junto con el respaldo
de la base; restaurar solo uno deja registros sin archivos o archivos sin registros.

### Restauración

1. Detén la API para evitar escrituras:

   ```bash
   docker compose stop app
   ```

2. Restaura la base en una base de destino. Para una prueba, usa una base desechable:

   ```bash
   DB_CONTAINER="$(docker compose ps -q db)" PGDATABASE=axia_restore_test \
     ./deploy/scripts/restore.sh /var/backups/axia/axia-<fecha>.dump
   ```

3. Restaura las evidencias si corresponde:

   ```bash
   ./deploy/scripts/restore-evidence.sh /var/backups/axia/axia-evidence-<fecha>.tgz
   ```

4. Vuelve a levantar la API y comprueba salud, login y un tiquet con evidencia.

Haz una prueba de restauración al menos una vez tras montar el servidor y después cada trimestre.
El criterio de éxito es que la aplicación abra con los datos restaurados y que los conteos de
tiquets, eventos y evidencias coincidan con el origen.

## 6. Verificación y CI

El flujo `.github/workflows/ci.yml` tiene dos compuertas:

- `check`: la compuerta existente con la web actual y pgTAP.
- `check-next`: PostgreSQL 17 real, migraciones, pruebas de servidor y `pnpm check:next`.

La compuerta nueva no publica ni toca la nube. Para ejecutarla localmente:

```bash
MIGRATION_DATABASE_URL='postgres://axia_owner:owner-test@127.0.0.1:55433/axia_test' \
AXIA_APP_PASSWORD='test-app-password' \
pnpm check:next
```

## 7. Secretos y rotación

| Variable | Generación | Rotación |
|---|---|---|
| `POSTGRES_OWNER_PASSWORD` | `openssl rand -hex 32` | Cambiar el rol dueño y actualizar `MIGRATION_DATABASE_URL` |
| `AXIA_APP_PASSWORD` | `openssl rand -hex 32` | Cambiar el rol app, actualizar `DATABASE_URL` y reiniciar `app` |
| `AXIA_DEMO_PASSWORD` | Opcional, solo demo local | Regenerar; nunca en producción |

Nunca se versionan `.env`, dumps ni el volumen de evidencias. El archivo `.env` debe tener permisos
`0600` y respaldarse de forma segura.

## 8. Si la instalación falla

- Si el script generó `.env` y falló antes de crear datos, conserva el archivo para reintentar; no lo
  borres a ciegas.
- Si existe el volumen `axia_axia_db_data` pero se perdió `.env`, no se pueden regenerar las
  contraseñas sobre esa base. Recupera el `.env` original o, solo si aceptas perder los datos,
  elimina el volumen de forma explícita y vuelve a instalar.
- `./scripts/install.sh --dry-run` muestra los pasos sin escribir archivos ni tocar contenedores.
