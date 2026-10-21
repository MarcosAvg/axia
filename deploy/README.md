# Despliegue

El despliegue de Axia usa PostgreSQL 17, el servicio `migrate` y el servidor Fastify `app` definidos
en `compose.yaml`.

- Instalación local o de prueba: `./scripts/install.sh` (ver `docs/start/instalacion.md`).
- Operación y respaldos: `docs/guides/operacion.md`.
- Producción: `cp .env.example .env`, generar secretos, `docker compose up -d db`,
  `docker compose run --rm migrate` y `docker compose up -d app`; el reverse proxy TLS queda fuera
  del repositorio.
- Respaldos: `deploy/scripts/backup.sh` (base), `deploy/scripts/backup-evidence.sh` (evidencias) y
  sus `restore*.sh`.
- La imagen `app` sirve el SPA compilado desde `STATIC_DIR=/app/web`; no se despliega la web por
  separado.

La ejecución real en un servidor la hace la persona; el agente no toca producción ni la nube.
