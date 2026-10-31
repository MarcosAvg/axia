# Instalación

Guía para instalar Axia en un equipo local o en un servidor propio. La operación posterior
(despliegue, respaldos y actualización) está en [`../guides/operacion.md`](../guides/operacion.md).

## Requisitos

| Entorno | Herramientas |
|---|---|
| Producción | Docker Engine, Compose v2 y reverse proxy TLS; no requiere Node/pnpm/Git |
| Desarrollo | Node.js 24, pnpm 12, Git, Docker/Compose y `openssl` |

El paquete operativo publicado contiene Compose y scripts, con la imagen fijada por digest.
Las comprobaciones de Node y pnpm siguientes corresponden solo a desarrollo.

```bash
node -v
pnpm -v
docker version
docker compose version
```

## Desarrollo local

```bash
pnpm install
./scripts/install.sh
pnpm dev
```

El instalador genera `.env.dev` con permisos `0600` y contraseñas aleatorias, sin imprimirlas.
Rechaza sobrescribir el archivo o regenerarlo si ya existe el volumen de desarrollo. Prepara
PostgreSQL y aplica migraciones; no inicia servidores HTTP. `--dry-run` no escribe ni inicia nada.

`pnpm dev` levanta únicamente PostgreSQL con `compose.dev.yaml` (proyecto `axia-dev`, base
`axia_dev`) y arranca API y web en el host con recarga automática. La API usa `3100` y las
evidencias de `apps/server/data/evidence`; Vite usa `5173` y reenvía `/api`. Al terminar se cierran
ambos watchers; la base permanece disponible. `pnpm dev:api` permite ejecutar solo el watcher API.
Un puerto de base ocupado por otro servicio se rechaza sin modificarlo; configurar otro `DB_PORT`
y ajusta ambas URLs en `.env.dev`. `AXIA_ENV_FILE` permite seleccionar otro archivo explícitamente.

Para probar la demo, usa `./scripts/install.sh --demo` en una instalación nueva, o carga
`pnpm db:demo -- --demo` de forma explícita después. La demo crea `demo.admin`: se ingresa con esa
cuenta y la contraseña comunicada por la semilla; el formulario de primer administrador corresponde
solo a la instalación vacía.

## Pruebas aisladas

```bash
pnpm test:db:start
pnpm db:test
pnpm test:e2e:smoke
pnpm test:db:stop
```

`compose.test.yaml` usa otro proyecto (`axia-test`), puerto `55433`, credenciales ficticias y datos
en tmpfs, sin volúmenes persistentes. Integración reconstruye `axia_test`; Playwright prepara
`axia_e2e`, usa API `3101`, web `5174` y evidencias en `apps/server/data/evidence-e2e`. La regresión
visual prepara el mismo entorno aislado; ejecutar ambas suites de navegador por separado.

Las pruebas nunca cargan `.env`, `.env.dev` ni archivos privados automáticamente. Los valores
predeterminados y las variables admitidas para CI están en `.env.test.example`. Antes de conectar
se exige loopback, un nombre con sufijo `_test` o `_e2e` según corresponda y ninguna opción en la
URL. E2E deriva su base de la URL de integración validada, o recibe
`AXIA_E2E_MIGRATION_DATABASE_URL`; no reutiliza la conexión de desarrollo. Para reiniciar desarrollo
hay que pedirlo explícitamente con `pnpm db:reset -- --development`, sobre una base terminada en
`_dev`. Ningún comando de pruebas elimina volúmenes de otros proyectos.

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
# Completar AXIA_IMAGE (release exacta), POSTGRES_OWNER_PASSWORD y AXIA_APP_PASSWORD.
# Generar cada uno: openssl rand -hex 32
chmod 600 .env
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy
docker compose up -d --wait
```

`compose.yaml` descarga las imágenes de GHCR, arranca `db`, ejecuta `migrate` y arranca `app` cuando
la migración termina. No hay que construir imágenes en el servidor ni usar `compose.dev.yaml`.

`app` no publica puertos: queda solo en la red Docker `proxy` como `axia:3100`. Conectar ahí el
Nginx Proxy Manager o el contenedor de `cloudflared` de la instancia. La guía concreta está en
[`../../deploy/README.md`](../../deploy/README.md).

El compose fija `TRUST_PROXY=true` porque la única entrada es ese proxy. La red `proxy` es externa y debe existir antes del arranque; puede cambiarse con
`AXIA_PROXY_NETWORK`. Aplicación y migrador usan la misma `AXIA_IMAGE`. Antes de actualizar se toma
un conjunto de respaldo y se detiene la app; el procedimiento completo está en la guía de operación.

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

Los scripts de desarrollo cargan `.env.dev` (o `AXIA_ENV_FILE`) antes de conectar, así que basta con editar
`AXIA_DEMO_PASSWORD` y repetir el comando. La contraseña se guarda hasheada en la base al sembrar:
reiniciar la API o el contenedor no la cambia. Los usuarios son `demo.admin`, `demo.supervisor`,
`demo.technician` y `demo.requester`.

## Variables

| Variable | Uso |
|---|---|
| `POSTGRES_OWNER_PASSWORD` | Rol dueño de la base; solo migraciones. Obligatoria |
| `AXIA_APP_PASSWORD` | Rol de aplicación, sin DDL. Obligatoria |
| `LOG_LEVEL` | Nivel de registro; opcional |
| `MIGRATION_DATABASE_URL` | Solo scripts del host |
| `DATABASE_URL` | Solo scripts del host |
| `DB_PORT` | Solo desarrollo local |
| `AXIA_DEMO_PASSWORD` | Opcional, solo semilla demo local |

Los secretos reales no se versionan. `.env` debe quedar con permisos `0600`.

## Base y migraciones

```bash
pnpm db:start
pnpm db:reset -- --development
pnpm db:test
pnpm db:demo -- --demo
```

Las migraciones viven en `apps/server/db/migrations/`. El runner usa un advisory lock y permite
`-- axia:no-transaction` para índices concurrentes. Una migración ya aplicada no se edita: se agrega
otra. El historial se verifica con hashes SHA-256 y se rechazan archivos ya aplicados cambiados o
ausentes. El historial anterior a este control se adopta una vez desde los SQL de la release; no
es posible verificar modificaciones previas a esa adopción.

## Verificación

```bash
pnpm check
```

La compuerta incluye lint, tipos, independencia, fronteras, knip, Vitest, Playwright, integración
contra PostgreSQL real y build. Inicia `pnpm test:db:start` antes; los valores locales de pruebas
son predeterminados y ficticios, con bases exclusivas para integración y Playwright.

## Si la instalación falla

- Si el instalador generó `.env.dev` y falló, conservar el archivo y reintentar con `pnpm dev`.
- Si existe el volumen `axia-dev_dev_db_data` pero falta `.env.dev`, recupera el archivo original;
  no regeneres contraseñas sobre esa base.
- Si otro servicio ocupa un puerto de desarrollo, configurar puertos libres sin modificarlo.
- `./scripts/install.sh --dry-run` muestra los pasos sin escribir archivos.

## Instalaciones locales anteriores

La configuración `.env` y el proyecto `axia` anteriores no se modifican automáticamente. Para seguir
con ese entorno, conservar sus archivos y respaldos. Para usar el nuevo desarrollo, preparar
`.env.dev` con un puerto disponible y base `_dev`; no reutilizar credenciales de producción. Si se
necesitan datos anteriores, realizar una transferencia deliberada mediante respaldo y recuperación
en un destino nuevo. Los comandos de pruebas nunca hacen esta transferencia.
