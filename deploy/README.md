# Axia — Despliegue (producción autoalojada)

Infraestructura de producción. **Nada de aquí se ejecuta desde el repositorio ni toca producción**:
son scripts y documentación que la persona ejecuta en su servidor.

## Qué hay aquí

- `scripts/up.sh` / `scripts/down.sh`: levantan y apagan el stack de Supabase autoalojado (traen el
  compose oficial) y, si defines `DATABASE_URL`, aplican migraciones.
- `scripts/migrate.sh`, `scripts/publish-web.sh`: migrar y publicar el frontend.
- `scripts/backup.sh`, `scripts/restore.sh`: respaldo y restauración con retención y *drill*.
- `supabase/`: cómo es el stack de Supabase autoalojado (compose oficial, sin versionar).
- `examples/`: **ejemplos opcionales** de reverse proxy (nginx, Traefik). **Tú eliges tu proxy.**
- `.env.production.example`: variables del build del frontend.

> **El reverse proxy no lo impone Axia.** Ver el *contrato* más abajo y monta el que ya uses.

## Requisitos

- Servidor Linux con Docker y Docker Compose, **dominio(s)** y puertos 80/443 abiertos.
- **Aviso:** Docker publica puertos saltándose algunos firewalls (p. ej. `ufw`). Enlaza los puertos
  internos a `127.0.0.1` o usa reglas en la cadena `DOCKER-USER`, y **nunca expongas Postgres a
  internet**.
- Secretos (`.env` de Supabase, claves) **fuera del repositorio**.

## Arranque rápido (un comando)

Desde la raíz del repositorio, en el servidor:

```bash
pnpm install
./deploy/scripts/up.sh
```

`up.sh` descarga el compose oficial de Supabase (si no está), lo levanta con `docker compose up -d`
y, cuando le pasas `DATABASE_URL`, aplica migraciones. Para ver qué haría sin ejecutar nada:

```bash
./deploy/scripts/up.sh --dry-run
```

Variables útiles: `SUPABASE_REF` (rama/etiqueta/commit del repo oficial para **pinar la versión**;
por defecto, la rama principal) y `COMPOSE_DIR` (dónde vive el compose copiado;
por defecto `deploy/supabase/docker`).

> **Edita los secretos antes de exponer.** El primer `up.sh` copia el `.env.example` oficial a
> `deploy/supabase/docker/.env`; cámbialo **todo** (ver `supabase/README.md`).

## Contrato de despliegue (tu proxy)

Axia solo necesita que un reverse proxy haga esto (con el proxy que prefieras):

1. **Servir los estáticos** de `apps/web/dist` y, si la ruta no existe, entregar `/index.html`
   (*fallback* SPA).
2. **Proxy hacia Kong** (la API de Supabase, por defecto `http://127.0.0.1:8000`) **permitiendo
   WebSocket** (Realtime) y pasando las cabeceras de autenticación.
3. **`no-cache`** para `/sw.js`, `/registerSW.js` y `/manifest.webmanifest` (que los móviles no
   queden con una versión vieja de la PWA).
4. **Límite de subida** suficiente para las **evidencias** (fotos); ajústalo también en Kong/Storage.
5. **TLS** donde tú decidas.

Puedes usar **un dominio para la web y otro para la API** (recomendado: el build apunta
`VITE_SUPABASE_URL` a la API), o un solo dominio con la API bajo una ruta. Lo que necesites.

### Ejemplos (opcionales)

- `examples/nginx.conf`: dos *server blocks* (web y api) con *fallback* SPA, `no-cache` y proxy a
  Kong con WebSocket.
- `examples/traefik.yml`: routers/servicios de Traefik como referencia.

Adáptalos; son solo puntos de partida.

## Paso a paso (alternativa manual)

### 1. Código
```bash
git clone <url-del-repositorio> axia && cd axia
pnpm install
```

### 2. Stack de Supabase (autoalojado)
`./deploy/scripts/up.sh` (o sigue `supabase/README.md` para hacerlo a mano). Cambia **todos** los
secretos en `deploy/supabase/docker/.env`.

### 3. Migraciones y semillas
```bash
DATABASE_URL='postgresql://<usuario>:<clave>@127.0.0.1:5432/postgres' ./deploy/scripts/migrate.sh
```
> En el compose oficial el puerto 5432 pasa por Supavisor y el usuario lleva un sufijo del tenant
> (`postgres.<POOLER_TENANT_ID>`); verifica la cadena en la guía oficial.

### 4. Frontend
```bash
cp deploy/.env.production.example deploy/.env.production   # y edítalo
set -a && . deploy/.env.production && set +a
DEPLOY_TARGET='TU_SERVIDOR:/srv/axia/web' ./deploy/scripts/publish-web.sh
```

### 5. Tu reverse proxy
Configura tu proxy según el **contrato** de arriba; el directorio publicado (`/srv/axia/web`) es el
que sirve. Revisa `examples/` si quieres un punto de partida.

### 6. Verificar
- `https://TU_DOMINIO_WEB` carga y permite iniciar sesión.
- `https://TU_DOMINIO_API/rest/v1/` responde.
- La PWA se puede instalar; el service worker se actualiza con el aviso en pantalla.

## Actualizar
```bash
git pull
pnpm install
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
- Cambia **todos** los secretos del compose oficial; no dejes los de ejemplo.
