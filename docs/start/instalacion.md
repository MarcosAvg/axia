# Instalación

Guía para instalar Axia en un equipo local o en un servidor propio. La operación posterior
(despliegue, respaldos y actualización) está en [`../guides/operacion.md`](../guides/operacion.md).

## Requisitos

- Node.js LTS, pnpm 12 y Git.
- Docker Engine con Compose v2.
- `openssl` para generar secretos.
- Un dominio y un reverse proxy TLS para producción.

```bash
node -v
pnpm -v
docker version
docker compose version
```

## Instalación local

```bash
corepack enable
pnpm install
./scripts/install.sh --demo
pnpm dev
```

El instalador:

1. comprueba Docker, Compose y `openssl`;
2. se niega a sobrescribir un `.env` existente;
3. genera `POSTGRES_OWNER_PASSWORD` y `AXIA_APP_PASSWORD` con 32 bytes aleatorios y escribe `.env`
   con permisos `0600`, sin imprimir los secretos;
4. construye las imágenes, levanta `db`, aplica `migrate` y levanta `app`;
5. espera a `GET /api/health/ready`;
6. con `--demo`, carga la semilla de demostración.

La API queda en `http://127.0.0.1:3100` y la web en `http://localhost:5173`. Vite reenvía `/api`.

Para desarrollo sin el contenedor `app`, ejecutar `pnpm dev:api` en otra terminal. El comando carga
`.env`, usa el puerto `3100` y guarda las evidencias en `apps/server/data/evidence` (o en la ruta de
`AXIA_DEV_STORAGE_DIR`), porque `/data/evidence` solo existe dentro del contenedor. La web se inicia
con `pnpm dev`.

La opción `--dry-run` muestra los pasos sin escribir archivos ni tocar contenedores. Las variables
`APP_PORT` y `DB_PORT` permiten cambiar los puertos locales. El instalador usa la plantilla de
desarrollo `.env.dev.example`; la de producción es `.env.example`.

## Primer administrador

La instalación no crea administradores automáticamente. En una instalación vacía, `/login` muestra
el formulario de primer arranque.

También se puede usar la API:

```bash
curl -sS -X POST http://127.0.0.1:3100/api/setup \
  -H 'content-type: application/json' \
  -d '{"username":"admin","fullName":"Administrador","password":"<contraseña>"}'
```

La contraseña debe tener al menos 12 caracteres. El primer arranque es de una sola vez; después se
usan `/api/auth/login` y la administración de usuarios.

## Instalación en producción

```bash
cp .env.example .env
# Completar POSTGRES_OWNER_PASSWORD y AXIA_APP_PASSWORD.
# Generar cada uno: openssl rand -hex 32
chmod 600 .env
docker compose up -d
```

`compose.yaml` descarga las imágenes de GHCR, arranca `db`, ejecuta `migrate` y arranca `app` cuando
la migración termina. No hay que construir imágenes en el servidor ni usar `compose.dev.yaml`.

`app` se conecta a la red `${PROXY_NETWORK:-proxy}` y publica `127.0.0.1:${APP_PORT:-3100}`. Un proxy
contenedor usa `app:3100` en la red `proxy`; un proxy del host apunta al puerto de loopback. Si el
proxy ya creó una red con otro nombre, define `PROXY_NETWORK` en `.env`. El contrato completo está en
[`../guides/operacion.md`](../guides/operacion.md#reverse-proxy).

`TRUST_PROXY=true` es obligatorio cuando el proxy termina TLS y reenvía `X-Forwarded-*`: sin él, el
guard de origen rechaza las peticiones `POST`/`PATCH`. Actívalo solo si la única vía a `app` es el
proxy de confianza.

Las imágenes de GHCR son públicas y no requieren autenticación. En actualizaciones,
`docker compose pull` descarga la nueva imagen y `docker compose up -d` vuelve a ejecutar `migrate`
antes de arrancar `app`.

## Semilla de demostración

Solo en local o en una instalación de prueba:

```bash
pnpm db:demo -- --demo
```

La demo crea usuarios, catálogos y seis tiquets ficticios. No se ejecuta al migrar, no se aplica en
producción y es idempotente: no duplica datos. Si `AXIA_DEMO_PASSWORD` está definida, la semilla
aplica esa contraseña también a los usuarios demo existentes; sin ella no rota las contraseñas ya
creadas salvo que se pase `--reset-passwords`. Ver
[ADR 0076](../decisions/0076-semillas-referencia-y-demo.md).

Los scripts de base cargan `.env` (o `AXIA_ENV_FILE`) antes de conectar, así que basta con editar
`AXIA_DEMO_PASSWORD` y repetir el comando. La contraseña se guarda hasheada en la base al sembrar:
reiniciar la API o el contenedor no la cambia. Los usuarios son `demo.admin`, `demo.supervisor`,
`demo.technician` y `demo.requester`.

## Variables

| Variable | Uso |
|---|---|
| `POSTGRES_OWNER_PASSWORD` | Rol dueño de la base; solo migraciones. Obligatoria |
| `AXIA_APP_PASSWORD` | Rol de aplicación, sin DDL. Obligatoria |
| `TRUST_PROXY` | `true` detrás de un proxy TLS |
| `APP_PORT` | Puerto de loopback que publica `app` |
| `AXIA_VERSION` | Imagen de GHCR; `latest` o un SHA |
| `LOG_LEVEL` | Nivel de registro; opcional |
| `MIGRATION_DATABASE_URL` | Solo scripts del host |
| `DATABASE_URL` | Solo scripts del host |
| `DB_PORT` | Solo desarrollo local |
| `AXIA_DEMO_PASSWORD` | Opcional, solo semilla demo local |

Los secretos reales no se versionan. `.env` debe quedar con permisos `0600`.

## Base y migraciones

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:demo -- --demo
```

Las migraciones viven en `apps/server/db/migrations/`. El runner usa un advisory lock y permite
`-- axia:no-transaction` para índices concurrentes. Una migración ya aplicada no se edita: se agrega
otra.

## Verificación

```bash
pnpm check
```

La compuerta incluye lint, tipos, independencia, fronteras, knip, Vitest, Playwright, integración
contra PostgreSQL real y build. Necesita `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y
`DATABASE_URL`; Playwright prepara su propia base con la semilla demo.

## Si la instalación falla

- Si el script generó `.env` y falló antes de crear datos, se conserva el archivo para reintentar.
- Si existe el volumen `axia_axia_db_data` pero se perdió `.env`, no se pueden regenerar las
  contraseñas sobre esa base. Se recupera el `.env` original o, solo si se acepta perder los datos,
  se elimina el volumen de forma explícita.
- `./scripts/install.sh --dry-run` muestra los pasos sin escribir archivos.
