# Despliegue

El despliegue de Axia usa PostgreSQL 17, el servicio `migrate` y el servidor Fastify `app` definidos
en `compose.yaml`.

- Instalación local o de prueba: `./scripts/install.sh` (ver `docs/migracion/instalacion-autoalojada.md`).
- Producción: `cp .env.example .env`, generar secretos, `docker compose up -d db`,
  `docker compose run --rm migrate` y `docker compose up -d app`; el reverse proxy TLS queda fuera
  del repositorio.
- Respaldos: `deploy/scripts/backup.sh` (base), `deploy/scripts/backup-evidence.sh` (evidencias) y
  sus `restore*.sh`.
- La web se publica desde el mismo servidor en el corte final (`STATIC_DIR`); no se despliega el SPA
  por separado.

La ejecución real en un servidor la hace la persona; el agente no toca producción ni la nube.
