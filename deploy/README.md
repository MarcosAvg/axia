# Axia — Despliegue (producción autoalojada)

Este directorio contendrá la infraestructura de producción. **Se puebla en la Fase 8**;
hoy solo reserva la estructura del monorepo.

Contenido previsto (ver `docs/configuracion-inicial.md`, sección 10):

- `docker-compose` del stack de Supabase autoalojado (copiado del compose oficial).
- `Caddyfile` (proxy TLS: API y frontend estático).
- Guías de operación: secretos, migraciones, respaldos y restauración.

Reglas:

- Nada aquí toca el núcleo ni el desarrollo local (`pnpm db:start` sigue siendo el flujo).
- Los secretos (`.env` de Supabase, claves) **nunca** se suben al repositorio.
- Los datos reales nunca se suben al repositorio; solo datos ficticios.
