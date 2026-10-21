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

La API queda en `http://127.0.0.1:3000` y la web en `http://localhost:5173`. Vite reenvía `/api`.

La opción `--dry-run` muestra los pasos sin escribir archivos ni tocar contenedores. Las variables
`APP_PORT` y `DB_PORT` permiten cambiar los puertos locales.

## Primer administrador

La instalación no crea administradores automáticamente. En una instalación vacía, `/login` muestra
el formulario de primer arranque.

También se puede usar la API:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/setup \
  -H 'content-type: application/json' \
  -d '{"username":"admin","fullName":"Administrador","password":"<contraseña>"}'
```

La contraseña debe tener al menos 12 caracteres. El primer arranque es de una sola vez; después se
usan `/api/auth/login` y la administración de usuarios.

## Instalación manual

```bash
cp .env.example .env
# Editar .env: reemplazar CHANGE_ME y las URLs de MIGRATION_DATABASE_URL/DATABASE_URL.
# Generar secretos: openssl rand -hex 32
chmod 600 .env
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
```

En producción no se usa `compose.dev.yaml`: ese archivo solo publica puertos en `127.0.0.1` para
desarrollo. El reverse proxy debe alcanzar el servicio `app` por la red interna de Compose, en el
puerto `3000`, o mediante un overlay de infraestructura.

`TRUST_PROXY=true` solo se activa si el proxy reenvía `X-Forwarded-*` y está en una red de
confianza.

La API tarda en arrancar hasta que `migrate` termina; `depends_on` lo garantiza. Si cambia una
migración o una variable, se reconstruye la imagen y se vuelve a ejecutar `migrate`.

## Semilla de demostración

Solo en local o en una instalación de prueba:

```bash
pnpm db:next:demo -- --demo
```

La demo crea usuarios, catálogos y seis tiquets ficticios. No se ejecuta al migrar, no se aplica en
producción y no sobrescribe contraseñas existentes salvo que se pase `--reset-passwords`. Ver
[ADR 0076](../decisions/0076-semillas-referencia-y-demo.md).

La contraseña se toma de `AXIA_DEMO_PASSWORD` o se genera una sola vez. Los usuarios son
`demo.admin`, `demo.supervisor`, `demo.technician` y `demo.requester`.

## Variables

| Variable | Uso |
|---|---|
| `POSTGRES_OWNER_PASSWORD` | Rol dueño de la base; solo migraciones |
| `AXIA_APP_PASSWORD` | Rol de aplicación, sin DDL |
| `MIGRATION_DATABASE_URL` | Conexión del runner de migraciones |
| `DATABASE_URL` | Conexión del servidor |
| `PORT` / `APP_PORT` | Puerto de la API |
| `DB_PORT` | Puerto local de PostgreSQL |
| `TRUST_PROXY` | Solo detrás de un proxy de confianza |
| `STORAGE_DIR` | Volumen de evidencias |
| `AXIA_DEMO_PASSWORD` | Opcional, solo semilla demo local |

Los secretos reales no se versionan. `.env` debe quedar con permisos `0600`.

## Base y migraciones

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:next:demo -- --demo
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
