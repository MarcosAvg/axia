# 0032 — Despliegue autoalojado y respaldos

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 7 (producción) estaba pendiente y `deploy/` era solo un marcador. Por las reglas del
proyecto, el agente **no toca producción**: prepara scripts y documentación, y la persona los
ejecuta. La guía de referencia es `docs/configuracion-inicial.md` §10.

## Decisión

- **Supabase autoalojado** con el compose oficial (no se copia al repositorio: cambia y lleva
  secretos). `deploy/supabase/` explica cómo copiarlo, qué secretos cambiar y el detalle de
  Supavisor.
- **Caddy** (`deploy/Caddyfile`) para TLS automático, frontend estático y proxy de la API, con
  `no-cache` del service worker. *(Superado por la ADR 0036: el proxy pasó a ser elección de quien
  despliega.)*
- **Scripts** en `deploy/scripts/`:
  - `migrate.sh` (`supabase db push --db-url`),
  - `publish-web.sh` (build con `.env.production` y `rsync` al servidor),
  - `backup.sh` (`pg_dump -Fc`, marca de tiempo y **retención**),
  - `restore.sh` (`pg_restore` con `--clean --if-exists`).
  Todos aceptan `DATABASE_URL` **o** `DB_CONTAINER` (dump/restore dentro del contenedor de base,
  útil para el compose oficial y para el drill local).
- **Sin secretos** en el repositorio: `.gitignore` en `deploy/` y `deploy/supabase/`; los ejemplos
  llevan **marcadores** (`TU_DOMINIO_*`, `TU_SERVIDOR`).
- **Runbook** en `deploy/README.md`: requisitos, aviso de Docker/firewall (no exponer Postgres),
  migrar, publicar, actualizar, verificar, respaldos y **prueba de restauración** (drill) con su
  criterio de éxito.

## Alternativas consideradas

- **Supabase Cloud**: se documentó como alternativa, pero se optó por el autoalojado.
- **CI/CD de despliegue**: se difiere; el despliegue es manual y documentado.
- **Notificaciones push**: se difieren (requieren VAPID y un servicio de envío).

## Consecuencias

- El despliegue es reproducible y seguro; la persona ejecuta y decide sobre su infraestructura.
- **Verificado en local**: `backup.sh` genera el dump y `restore.sh` lo restaura en una base
  desechable (conteos comprobados); los 174 avisos de `pg_restore` son esperables (roles y
  extensiones) y no afectan los datos.
- Pendientes: iconos definitivos de la PWA (logo), push y CI/CD; y opcionalmente 6C-2/6D.
