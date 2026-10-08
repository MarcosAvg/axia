# 0037 — Axia con Docker Compose, config en runtime e imágenes publicadas

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

Tras la ADR 0036 (el proxy es elección de quien despliega), faltaba la convención habitual de las
apps autoalojadas: **un `docker-compose.yml` que da el proyecto**, se configura con un `.env` y se
levanta con `docker compose up`, **sin clonar el repositorio**. Axia son dos piezas: el **frontend**
estático y el **backend Supabase** (que va aparte).

El obstáculo era que el frontend cocía `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el build
(`lib/supabase.ts`, `offline-evidence.ts`), así que una imagen genérica no podía servir para
cualquier instalación.

## Decisión

- **Dos piezas separadas**: Supabase (Cloud o autoalojado) por un lado; **Axia con su propio
  `docker-compose.yml`** (`web` + `migrate`) por otro, apuntando a ese Supabase.
- **Configuración en runtime**: `index.html` carga `/config.js`; `lib/runtime-config.ts` lee
  `window.__AXIA_CONFIG__` con **respaldo a `import.meta.env`** (el `pnpm dev` no cambia). El
  contenedor `web` genera `config.js` al arrancar desde `SUPABASE_URL`/`SUPABASE_ANON_KEY`. Una sola
  imagen sirve para cualquier instalación (y para promover entre entornos).
- **Imágenes**: `deploy/web.Dockerfile` (build del SPA → nginx) y `deploy/migrate.Dockerfile` (CLI de
  Supabase + `supabase/migrations`). Se publican en **GHCR** con
  `.github/workflows/publish-images.yml` (manual o al etiquetar `v*`); el push lo dispara la persona.
- **`migrate`** es un servicio de un solo uso (`docker compose run --rm migrate`), fuera del `up`.
- El `docker-compose.yml` **no** define el stack de Supabase: eso lo aporta Supabase (Cloud o su
  compose). Se mantiene el `up.sh` para el autoalojado.

## Alternativas consideradas

- **Cocinar `VITE_*` en el build**: obliga a construir la imagen por instalación (con el repo);
  descartado.
- **Un único compose con Supabase dentro**: obliga a versionar el stack de Supabase (ver ADR 0036);
  descartado.
- **Sin imágenes publicadas**: `docker compose build` local; válido, pero exige el código. Se deja
  como opción por defecto (build) y las imágenes para el flujo "sin clonar".

## Consecuencias

- La instalación es: descargar `docker-compose.yml` + `.env.example`, editar secretos,
  `docker compose up -d` y `docker compose run --rm migrate`.
- `config.js` **no** se precachea en el service worker (para no quedar con valores viejos) pero sí se
  cachea en runtime (`NetworkFirst`) para el modo offline.
- Verificado en local: la imagen `web` genera `config.js` desde el entorno, sirve el SPA y responde
  `no-store`/`no-cache`; la imagen `migrate` dice "Remote database is up to date" contra la base
  local.
- Pendiente operativo (de la persona): publicar las imágenes en GHCR y desplegar.
