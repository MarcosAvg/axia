# Despliegue

El despliegue de Axia usa PostgreSQL 17, el servicio `migrate` y el servidor Fastify `app` definidos
en `compose.yaml`.

- Instalación local o de prueba: `./scripts/install.sh` (ver `docs/start/instalacion.md`).
- Operación, proxy y respaldos: `docs/guides/operacion.md`.
- Producción: `cp .env.example .env`, completar los dos secretos y ejecutar `docker compose up -d`.
  Compose descarga las imágenes de GHCR, arranca `db`, ejecuta `migrate` y arranca `app`.
- Actualización: `docker compose pull && docker compose up -d`.
- Respaldos: `deploy/scripts/backup.sh` (base), `deploy/scripts/backup-evidence.sh` (evidencias) y
  sus `restore*.sh`.
- Limpieza y retención: `deploy/scripts/cleanup.sh` (cron sugerido en `docs/guides/operacion.md`).
- La imagen `app` sirve el SPA compilado desde `STATIC_DIR=/app/web`; no se despliega la web por
  separado.

Las imágenes son `ghcr.io/marcosavg/axia/axia-app` y `ghcr.io/marcosavg/axia/axia-migrate`, y son
públicas: `docker compose up -d` las descarga sin credenciales.

## Reverse proxy

El repositorio **no incluye** proxy ni TLS. `app` se conecta a la red `${PROXY_NETWORK:-proxy}`
(Compose la crea si no existe) y además publica `127.0.0.1:${APP_PORT:-3100}`:

- **Proxy contenedor:** únelo a la red `proxy` y apunta a `app:3100`. Es la opción recomendada.
- **Proxy en el host:** apunta a `127.0.0.1:3100` (no a `localhost`, que puede resolverse a IPv6).

Si el proxy ya creó una red con otro nombre, define `PROXY_NETWORK` en `.env`. Si la declara como
`external`, créala antes con `docker network create proxy`. El contrato (cabeceras, `TRUST_PROXY`,
TUS, SSE y caché) está en
[`../docs/guides/operacion.md`](../docs/guides/operacion.md#reverse-proxy).

La ejecución real en un servidor la hace la persona; el agente no toca producción ni la nube.
