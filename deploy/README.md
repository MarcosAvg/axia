# Despliegue

El despliegue de Axia usa PostgreSQL 17, el servicio `migrate` y el servidor Fastify `app` definidos
en `compose.yaml`.

- Instalación local o de prueba: `./scripts/install.sh` (ver `docs/start/instalacion.md`).
- Operación, proxy y respaldos: `docs/guides/operacion.md`.
- Producción: `cp .env.example .env`, generar secretos, `docker compose up -d db`,
  `docker compose run --rm migrate` y `docker compose up -d app`.
- Respaldos: `deploy/scripts/backup.sh` (base), `deploy/scripts/backup-evidence.sh` (evidencias) y
  sus `restore*.sh`.
- Limpieza y retención: `deploy/scripts/cleanup.sh` (cron sugerido en `docs/guides/operacion.md`).
- La imagen `app` sirve el SPA compilado desde `STATIC_DIR=/app/web`; no se despliega la web por
  separado.

## Reverse proxy

El repositorio **no incluye** proxy ni TLS. Hay dos formas de conectarlo:

- **Proxy en el host:** exporta `COMPOSE_FILE=compose.yaml:compose.publish.yaml`. Ese overlay
  publica `app` solo en `127.0.0.1:3100`; el proxy apunta a esa dirección.
- **Proxy contenedor:** únelo a la red de Compose y apunta a `app:3100`; no hace falta publicar
  puertos.

El contrato (cabeceras, `TRUST_PROXY`, TUS, SSE y caché) está en
[`../docs/guides/operacion.md`](../docs/guides/operacion.md#reverse-proxy).

La ejecución real en un servidor la hace la persona; el agente no toca producción ni la nube.
