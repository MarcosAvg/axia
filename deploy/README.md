# Axia — Despliegue en producción

## Objeto

Documentar el despliegue de Axia en un servidor propio. Los archivos de esta carpeta son scripts y
plantillas que se ejecutan en el servidor de destino; ninguno se ejecuta desde el repositorio.

## Arquitectura del despliegue

El despliegue consta de dos piezas independientes:

| Pieza | Contenido | Procedencia |
|---|---|---|
| Backend | Postgres, Auth, Storage, Realtime y Kong (API) | Supabase Cloud o Supabase autoalojado |
| Frontend | Aplicación web estática y migraciones | Imágenes de Axia (Docker Compose) o archivos estáticos |

El **reverse proxy TLS pertenece a la infraestructura de destino**: Axia define un contrato
(sección «Contrato de reverse proxy») y ofrece ejemplos, pero no impone ninguna solución.

## Contenido de la carpeta

| Ruta | Descripción |
|---|---|
| `docker-compose.yml` | Servicios de la app (`web` y `migrate`) |
| `.env.example` | Plantilla de variables del compose |
| `web.Dockerfile` | Imagen del frontend (compila el SPA y lo sirve con nginx) |
| `migrate.Dockerfile` | Imagen de migraciones (CLI de Supabase y `supabase/migrations`) |
| `docker/` | Configuración de nginx y generación de `config.js` |
| `supabase/` | Puesta en marcha del stack de Supabase autoalojado |
| `scripts/` | `up.sh`, `down.sh`, `migrate.sh`, `publish-web.sh`, `backup.sh`, `restore.sh` |
| `examples/` | Ejemplos de reverse proxy (nginx, Traefik) |
| `.env.production.example` | Variables del build estático (modalidad de archivos estáticos) |

## Requisitos

| Requisito | Detalle |
|---|---|
| Sistema | Servidor Linux con Docker y Docker Compose |
| Red | Uno o dos dominios y los puertos 80/443 abiertos |
| Secretos | Archivos `.env` y claves fuera del repositorio |

> **Advertencia:** Docker publica puertos omitiendo algunos cortafuegos (por ejemplo, `ufw`). Los
> puertos internos deben enlazarse a `127.0.0.1` o regularse en la cadena `DOCKER-USER`. La base de
> datos **nunca** debe quedar expuesta a internet.

## Procedimiento

### A. App con Docker Compose

1. Crear el archivo de entorno a partir de la plantilla y ajustar los valores:

   ```bash
   cp .env.example .env
   ```

2. Levantar el servicio web:

   ```bash
   docker compose up -d
   ```

3. Aplicar las migraciones:

   ```bash
   docker compose run --rm migrate
   ```

| Servicio | Función |
|---|---|
| `web` | Sirve el frontend y genera su configuración en runtime (`config.js`). Publica en `WEB_PORT` (por defecto, 8080). |
| `migrate` | Aplica `supabase/migrations` a la base indicada en `DATABASE_URL`. Se ejecuta de forma puntual. |

Las imágenes se construyen en local (`docker compose build`) o se descargan de GHCR
(`.github/workflows/publish-images.yml`); en este segundo caso se definen `AXIA_WEB_IMAGE` y
`AXIA_MIGRATE_IMAGE` en el `.env`.

> **Nota:** para la conexión a la base, Supabase Cloud usa TLS por defecto. En un Supabase
> autoalojado sin TLS debe añadirse `?sslmode=disable` al valor de `DATABASE_URL`.

### B. Frontend como archivos estáticos

1. Crear el archivo de variables y ajustar los valores:

   ```bash
   cp deploy/.env.production.example deploy/.env.production
   ```

2. Cargar las variables y publicar:

   ```bash
   set -a && . deploy/.env.production && set +a
   DEPLOY_TARGET='TU_SERVIDOR:/srv/axia/web' ./deploy/scripts/publish-web.sh
   ```

### C. Backend Supabase

| Modalidad | Procedimiento |
|---|---|
| Supabase Cloud | Crear el proyecto y usar su URL y claves en el `.env`. No requiere despliegue en el servidor. |
| Supabase autoalojado | Ejecutar `./deploy/scripts/up.sh` (descarga el compose oficial y aplica migraciones si existe `DATABASE_URL`). El detalle manual y los secretos están en `supabase/README.md`. |

En el Supabase autoalojado, el puerto 5432 sale por Supavisor y el usuario de base incluye el sufijo
del tenant (`postgres.<POOLER_TENANT_ID>`). La cadena de conexión debe verificarse en la guía oficial.

## Contrato de reverse proxy

El reverse proxy de la infraestructura de destino debe cumplir:

| Nº | Requisito |
|---|---|
| 1 | Servir el frontend (el puerto `WEB_PORT` del compose o el directorio de archivos estáticos) con *fallback* a `/index.html` |
| 2 | Enrutar hacia Kong (API de Supabase, por defecto `http://127.0.0.1:8000`) permitiendo **WebSocket** (Realtime) y conservando las cabeceras de autenticación |
| 3 | Aplicar `no-cache` a `/config.js`, `/sw.js`, `/registerSW.js` y `/manifest.webmanifest` |
| 4 | Permitir el tamaño de subida de las **evidencias** (fotos), también en Kong y Storage |
| 5 | Terminar **TLS** |

Es posible usar un dominio para la web y otro para la API (recomendado, ya que el build apunta a la
API), o un único dominio con la API bajo una ruta.

### Ejemplos

- `examples/nginx.conf`: dos *server blocks* (web y API).
- `examples/traefik-compose.yml`: Traefik y un nginx que sirve los archivos estáticos.

Son puntos de partida y deben adaptarse a cada infraestructura.

## Migraciones

Con Docker Compose:

```bash
docker compose run --rm migrate
```

Sin contenedores:

```bash
DATABASE_URL='postgresql://<usuario>:<clave>@127.0.0.1:5432/postgres' ./deploy/scripts/migrate.sh
```

## Verificación

- `https://TU_DOMINIO_WEB` carga y permite iniciar sesión.
- `https://TU_DOMINIO_API/rest/v1/` responde.
- La PWA se instala y el service worker se actualiza con el aviso en pantalla.

## Actualización

```bash
git pull
pnpm install
```

Con Docker Compose:

```bash
docker compose build && docker compose up -d && docker compose run --rm migrate
```

Sin contenedores:

```bash
DATABASE_URL=... ./deploy/scripts/migrate.sh
DEPLOY_TARGET=... ./deploy/scripts/publish-web.sh
```

## Respaldos y restauración

```bash
BACKUP_DIR=/var/backups/axia RETENTION_DAYS=14 DB_CONTAINER=<contenedor-db> ./deploy/scripts/backup.sh
DB_CONTAINER=<contenedor-db> PGDATABASE=<db-destino> ./deploy/scripts/restore.sh /var/backups/axia/axia-<fecha>.dump
```

| Script | Función |
|---|---|
| `backup.sh` | `pg_dump -Fc` con marca de tiempo y borrado de los respaldos anteriores a la retención |
| `restore.sh` | `pg_restore` de un respaldo sobre una base de destino |

> **Nota:** practicar una restauración (drill) al menos una vez tras montar el servidor y, después,
> cada trimestre. El criterio de éxito es que la aplicación abra con los datos restaurados y que los
> conteos coincidan con el origen.

## Seguridad

- La **service role key** reside únicamente en el servidor (Edge Functions y tareas programadas);
  nunca en el frontend ni en el repositorio.
- Todos los secretos del backend deben reemplazarse; no deben conservarse los valores de ejemplo.
