# Axia — Despliegue (producción autoalojada)

Infraestructura de producción. **Nada de aquí se ejecuta desde el repositorio ni toca
producción**: son scripts y documentación que la persona ejecuta en su servidor.

- `Caddyfile`: proxy TLS (frontend estático y API).
- `.env.production.example`: variables del build del frontend.
- `supabase/`: cómo levantar el stack de Supabase autoalojado (compose oficial).
- `scripts/`: migrar, publicar el frontend y respaldar/restaurar.

Reemplaza los marcadores (`TU_DOMINIO_WEB`, `TU_DOMINIO_API`, `TU_SERVIDOR`) por los tuyos.

## Requisitos

- Servidor Linux con Docker y Docker Compose, **dominio(s)** y puertos 80/443 abiertos.
- **Aviso:** Docker publica puertos saltándose algunos firewalls (p. ej. `ufw`). Enlaza los puertos
  internos a `127.0.0.1` o usa reglas en la cadena `DOCKER-USER`, y **nunca expongas Postgres a
  internet**.
- Secretos (`.env` de Supabase, claves) **fuera del repositorio**.

## Pasos

### 1. Código
```bash
git clone <url-del-repositorio> axia && cd axia
pnpm install
```

### 2. Stack de Supabase (autoalojado)
Sigue `supabase/README.md`: copia el compose oficial, edita sus secretos y levántalo con
`docker compose up -d`.

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

### 5. Caddy (TLS automático)
```bash
cp deploy/Caddyfile /etc/caddy/Caddyfile   # edita los dominios primero
caddy reload --config /etc/caddy/Caddyfile
```

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
