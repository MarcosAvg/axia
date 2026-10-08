# Axia — Despliegue (producción autoalojada)

Infraestructura de producción. **Nada de aquí se ejecuta desde el repositorio ni toca
producción**: son archivos y scripts que la persona ejecuta en su servidor.

El despliegue tiene **dos piezas**:

1. **Supabase** (backend): Cloud o autoalojado. Ver [`supabase/`](supabase/README.md).
2. **Axia** (frontend + migraciones): con **Docker Compose** o publicando los estáticos.

El **reverse proxy TLS es tuyo**: Axia solo define un contrato (más abajo) y da ejemplos.

## Qué hay aquí

- `docker-compose.yml` + `.env.example`: **Axia con Docker Compose** (webs + migraciones).
- `web.Dockerfile`, `migrate.Dockerfile`, `docker/`: las imágenes (frontend y migraciones).
- `.env.production.example`: variables del build estático (cuando sirves los archivos a mano).
- `supabase/`: el stack de Supabase autoalojado (compose oficial, sin versionar).
- `scripts/`: `up.sh`/`down.sh` (Supabase), `migrate.sh`, `publish-web.sh`, `backup.sh`, `restore.sh`.
- `examples/`: **ejemplos opcionales** de reverse proxy (nginx, Traefik).

## Requisitos

- Servidor Linux con Docker y Docker Compose, **dominio(s)** y puertos 80/443 abiertos.
- **Aviso:** Docker publica puertos saltándose algunos firewalls (p. ej. `ufw`). Enlaza los puertos
  internos a `127.0.0.1` o usa reglas en la cadena `DOCKER-USER`, y **nunca expongas Postgres a
  internet**.
- Secretos (`.env`, claves) **fuera del repositorio**.

## Axia con Docker Compose (recomendado)

Copia `docker-compose.yml` y `.env.example`, edita el `.env` y ejecuta:

```bash
cp .env.example .env   # edita SUPABASE_URL, SUPABASE_ANON_KEY y DATABASE_URL
docker compose up -d
docker compose run --rm migrate   # aplica las migraciones
```

- **`web`** sirve el frontend y lee su configuración en **runtime** (`config.js`): la **misma
  imagen** sirve para cualquier instalación. Publica en `WEB_PORT` (8080); tu proxy TLS apunta ahí.
- **`migrate`** aplica `supabase/migrations` al Supabase que indiques (`DATABASE_URL`).
- **Imágenes**: por defecto se construyen en local (`docker compose build`). En CI se publican en
  GHCR (`.github/workflows/publish-images.yml`); para usarlas, define `AXIA_WEB_IMAGE` y
  `AXIA_MIGRATE_IMAGE` en el `.env`.

> La conexión a la base: en **Cloud** TLS va por defecto; en **autoalojado sin TLS** añade
> `?sslmode=disable` al `DATABASE_URL`.

## Alternativa: estáticos a tu proxy

Si prefieres no usar contenedores para el frontend, publica los archivos y sírvelos con tu proxy:

```bash
cp deploy/.env.production.example deploy/.env.production   # y edítalo
set -a && . deploy/.env.production && set +a
DEPLOY_TARGET='TU_SERVIDOR:/srv/axia/web' ./deploy/scripts/publish-web.sh
```

## Supabase (backend)

- **Cloud**: crea el proyecto y usa su URL y claves en el `.env`. Nada que desplegar aquí.
- **Autoalojado**: `./deploy/scripts/up.sh` (trae el compose oficial y aplica migraciones si hay
  `DATABASE_URL`); el detalle manual y los secretos están en [`supabase/`](supabase/README.md).
  Ahí el puerto 5432 sale por Supavisor y el usuario lleva un sufijo del tenant
  (`postgres.<POOLER_TENANT_ID>`); verifica la cadena.

## Contrato de despliegue (tu proxy)

Axia solo necesita que un reverse proxy haga esto (con el que prefieras):

1. **Servir el frontend**: apunta a `WEB_PORT` (compose) o al directorio publicado, con *fallback* a
   `/index.html` (SPA).
2. **Proxy hacia Kong** (la API de Supabase, por defecto `http://127.0.0.1:8000`) **permitiendo
   WebSocket** (Realtime) y pasando las cabeceras de autenticación.
3. **`no-cache`** para `/config.js`, `/sw.js`, `/registerSW.js` y `/manifest.webmanifest`.
4. **Límite de subida** suficiente para las **evidencias** (fotos); ajústalo también en Kong/Storage.
5. **TLS** donde tú decidas.

Puedes usar **un dominio para la web y otro para la API** (recomendado: el build apunta a la API), o
un solo dominio con la API bajo una ruta.

### Ejemplos (opcionales)

- `examples/nginx.conf`: dos *server blocks* (web y api).
- `examples/traefik-compose.yml`: Traefik + un nginx que sirve los estáticos.

Adáptalos; son solo puntos de partida.

## Migraciones

Con el compose: `docker compose run --rm migrate`. Sin contenedores:

```bash
DATABASE_URL='postgresql://<usuario>:<clave>@127.0.0.1:5432/postgres' ./deploy/scripts/migrate.sh
```

## Verificar

- `https://TU_DOMINIO_WEB` carga y permite iniciar sesión.
- `https://TU_DOMINIO_API/rest/v1/` responde.
- La PWA se puede instalar; el service worker se actualiza con el aviso en pantalla.

## Actualizar

```bash
git pull
pnpm install
# Con compose:
docker compose build && docker compose up -d && docker compose run --rm migrate
# Sin contenedores:
DATABASE_URL=... ./deploy/scripts/migrate.sh
DEPLOY_TARGET=... ./deploy/scripts/publish-web.sh
```

## Respaldos y restauración

```bash
BACKUP_DIR=/var/backups/axia RETENTION_DAYS=14 DB_CONTAINER=<contenedor-db> ./deploy/scripts/backup.sh
DB_CONTAINER=<contenedor-db> PGDATABASE=<db-destino> ./deploy/scripts/restore.sh /var/backups/axia/axia-<fecha>.dump
```

- `backup.sh` hace `pg_dump -Fc` con marca de tiempo y **borra** los dumps más viejos que la
  retención.
- **Prueba de restauración (drill)**: restaura el último dump en una base **desechable**, verifica
  un par de conteos y bórrala. Hazlo al menos una vez tras montar el servidor y luego cada trimestre.
  Criterio de éxito: la app abre con los datos restaurados y los conteos coinciden con el origen.

## Seguridad

- La **service role key** vive solo en el servidor (Edge Functions / tareas), **nunca** en el
  frontend ni en el repositorio.
- Cambia **todos** los secretos; no dejes los de ejemplo.
