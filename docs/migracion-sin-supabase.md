# Migración de Axia fuera de Supabase

**Estado:** Etapa A — auditoría y plan, pendiente de aprobación.
**Fecha:** 2026-10-18.
**Alcance:** sustituir Supabase por una aplicación Node + PostgreSQL desplegable con un solo
`compose.yaml`, conservando el comportamiento del núcleo.

> Este documento es el punto de control. **No se ha modificado código de la aplicación** para esta
> Etapa A. La implementación empieza solo después de la aprobación explícita de la persona.

## 0. Resumen ejecutivo

Axia funciona hoy como una SPA de React sobre Supabase. La migración es grande, pero el riesgo de
datos es bajo: **no hay datos reales que conservar** y la instalación puede nacer vacía. El riesgo
principal está en la lógica: hay **42 migraciones SQL, 40 tablas con RLS, 33 políticas, 32 claves
foráneas a `auth.users`, 117 usos de `auth.uid()`, 53 funciones `security definer` y unas 80
funciones/RPC** que hoy concentran transiciones, permisos, importación y notificaciones.

Elementos que cambian de forma sustancial:

- No hay código de Realtime en el cliente, aunque `[realtime]` está habilitado en la configuración
  local. El requisito de tiempo real **no está implementado hoy**; se construirá con
  `LISTEN/NOTIFY` + SSE.
- No existe `supabase/functions/` ni un proceso de envío de notificaciones push. `push_subscriptions`
  existe como tabla, pero no hay cliente que registre suscripciones ni service worker que reciba
  `push`.
- La tabla `idempotency_keys` existe, pero las RPC actuales usan `ticket_events.client_request_id`
  como mecanismo real de idempotencia.
- El frontend no llama a Supabase fuera de `features/*/api` y `lib/`, salvo la configuración de
  entorno de Vite y las pruebas. No se encontraron llamadas directas en componentes.
- Hay una contraseña fija de demostración en archivos versionados. No se reproduce su valor en este
  documento; debe eliminarse antes de la entrega final.

Recomendación: **Fastify + Drizzle + PostgreSQL 17 + `pg` Pool**; migración base aplanada y
equivalente; autorización central en TypeScript con repositorios de tickets con alcance; Vitest
contra PostgreSQL real para servicios y autorización; conservar pgTAP solo para invariantes puros de
base de datos, si se aprueba. El detalle está en las secciones 2 a 8.

## 1. Inventario de dependencias de Supabase

### 1.1 Paquetes, configuración y herramientas

| Archivo | Dependencia | Destino |
|---|---|---|
| `apps/web/package.json` | `@supabase/supabase-js` (runtime) | Eliminar; sustituir por `lib/api-client.ts` |
| `apps/web/package.json` | `tus-js-client` | Conservar; apuntar al endpoint TUS propio |
| `apps/web/package.json` | `dexie`, `dexie-react-hooks` | Conservar; adaptar contrato offline |
| `apps/web/package.json` | `vite-plugin-pwa` | Conservar; pasar a `injectManifest` para `push` |
| `package.json` (raíz) | `supabase` CLI 2.120.0 y scripts `db:start`, `db:stop`, `db:reset`, `db:test`, `db:types`, `env:local` | Sustituir por Drizzle, Docker Compose y Vitest |
| `packages/shared/src/database.types.ts` | Tipos generados por `supabase gen types` | Sustituir por tipos inferidos de Drizzle y esquemas Zod |
| `apps/web/src/lib/supabase.ts` | Cliente único de Supabase | Eliminar; crear `lib/api-client.ts` |
| `apps/web/src/lib/runtime-config.ts` | URL y clave anónima de Supabase en runtime | Eliminar; misma origen `/api` |
| `apps/web/public/config.js` | Configuración runtime con URL/clave | Eliminar o dejar solo `apiBaseUrl` si hiciera falta |
| `apps/web/index.html` | Carga `config.js` | Quitar la carga |
| `apps/web/vite.config.ts` | Variables `VITE_SUPABASE_*` para Vitest | Sustituir por configuración de API de prueba |
| `supabase/config.toml` | Configuración del stack local | Eliminar con la carpeta `supabase/` |
| `supabase/.gitignore`, `.temp`, `.branches` | Artefactos del CLI | Eliminar |
| `scripts/write-local-env.mjs` | Lee `supabase status` y escribe `.env.local` | Sustituir por script de entorno local del compose |
| `scripts/clean-test-data.mjs` | Usa el contenedor `supabase_db_*` | Sustituir por limpieza contra `DATABASE_URL` |
| `scripts/bootstrap.sh` | Levanta Supabase y muestra usuarios demo | Sustituir por instalación Docker/Drizzle |
| `scripts/check-agnostic.mjs` | Rutas permitidas de `supabase/functions` | Ajustar a la nueva arquitectura |
| `.github/workflows/ci.yml` | `pnpm db:start`, `pnpm env:local` | Sustituir por servicio `db` y migraciones |
| `.github/workflows/deploy.yml` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Sustituir por despliegue de imágenes/compose |
| `.github/workflows/publish-images.yml` | Publica imágenes de `web`/`migrate` | Adaptar al servidor único |
| `deploy/docker-compose.yml` | `web` + `migrate` apuntando a Supabase | Sustituir por `db` + `migrate` + `app` |
| `deploy/web.Dockerfile`, `deploy/docker/nginx.conf` | Frontend estático con nginx | Sustituir por imagen del servidor Node |
| `deploy/migrate.Dockerfile` | CLI de Supabase | Sustituir por migrador Drizzle |
| `deploy/docker/40-axia-config.sh` | Genera `config.js` con URL/clave | Eliminar |
| `deploy/scripts/*` | `up/down/migrate/publish/backup/restore` con Supabase | Reescribir para el compose nuevo |
| `deploy/supabase/` | Compose oficial de Supabase | Eliminar |
| `deploy/examples/traefik-compose.yml` | Red `supabase_default` | Adaptar a la red de Axia |

### 1.2 Autenticación

| Archivo | Uso actual | Destino |
|---|---|---|
| `features/auth/api/auth-api.ts` | `getSession`, `onAuthStateChange`, `signInWithPassword`, `signOut`, RPC `me`, RPC `profile_update` | API `/api/auth/*` y `/api/me`; sesión opaca en cookie |
| `features/auth/hooks/use-auth-session.ts` | Se suscribe a Supabase Auth | Consulta `/api/auth/session` y refresco al enfocar |
| `features/auth/hooks/auth-provider.tsx` | Identidad desde `me()` | `GET /api/me`; misma interfaz pública |
| `features/auth/components/login-form.tsx` | Correo + contraseña | Usuario + contraseña |
| `features/auth/schemas.ts` | `z.email()` y respuesta `me()` | `username`, contraseña, respuesta de sesión |
| `features/auth/i18n.ts` | Textos de correo | Textos de usuario; sin correo |
| `supabase/migrations/20261008090000_auth_profiles_and_identity.sql` | Disparador `on_auth_user_created`, `me`, `profile_update` | Eliminar; usuarios, sesiones y perfil en servicios |
| `supabase/migrations/20261008151000_me_timezone.sql` | `me()` con zona horaria | La identidad la devuelve el servidor |
| `supabase/seed.sql` | Inserta `auth.users` y `auth.identities` con contraseña fija | Semilla de usuarios nueva, sin contraseña fija |

**Hallazgo:** la UI actual usa correo como identidad. El nuevo modelo usa **nombre de usuario**. No
hay recuperación por correo: el restablecimiento lo hace un administrador y genera una contraseña
temporal.

### 1.3 Acceso a datos del cliente

Todos los archivos siguientes están dentro de `features/*/api` o `lib/`, que es la frontera
permitida. No se encontraron componentes que importen `@supabase/supabase-js` directamente.

| Archivo | Operaciones actuales | Destino |
|---|---|---|
| `admin/api/access-api.ts` | ~20 operaciones sobre `roles`, `permissions`, `role_permissions`, `profiles`, `user_roles`, `requesters`, `technicians`, `supervisor_scopes`, `supervisor_scope_buildings`, `technician_categories` | `/api/admin/roles`, `/api/admin/users`, `/api/admin/scopes`, `/api/admin/designations` |
| `admin/api/admin-api.ts` | CRUD genérico sobre 14 catálogos | `/api/admin/catalogs/:catalog` con lista blanca y Zod |
| `admin/api/calendar-api.ts` | Calendarios, franjas y festivos | `/api/admin/calendars` |
| `admin/api/catalog-import-api.ts` | 3 RPC de importación + lectura de `catalog_import_runs` + catálogos | `/api/admin/catalog-imports` |
| `admin/api/import-api.ts` | Mapa de estatus, lotes, tareas + 2 RPC | `/api/admin/imports` |
| `admin/api/settings-api.ts` | Lectura/escritura de `instance_settings` | `/api/admin/settings` |
| `auth/api/auth-api.ts` | Auth + `me` + `profile_update` | `/api/auth/*`, `/api/me` |
| `catalogs/api/catalogs-api.ts` | 9 catálogos (`teams`, `priorities`, `locations`, `categories`, `subcategories`, `problems`, `requesters`, `technicians`, `reasons`) | `/api/catalogs/:catalog` |
| `dashboard/api/dashboard-api.ts` | `v_ticket_timeline` + `tickets` | `/api/dashboard` |
| `integrations/api/import-run-api.ts` | 10 RPC de importación + `instance_settings` + catálogos | `/api/admin/imports/:id/...` |
| `metrics/api/metrics-api.ts` | `v_ticket_metrics_base` + 11 RPC de indicadores | `/api/metrics/...` (mismas vistas/funciones SQL con alcance) |
| `tickets/api/evidence-api.ts` | `storage.createSignedUrl` | `/api/evidence/:id/file` y `/thumbnail` |
| `tickets/api/offline-evidence.ts` | TUS a Storage + `evidence_add` | TUS propio + `/api/evidence` |
| `tickets/api/pause-api.ts` | 3 RPC | Acciones de pausa |
| `tickets/api/rating-api.ts` | `ticket_ratings` + `ticket_rate` | `/api/tickets/:id/rating` |
| `tickets/api/tickets-api.ts` | Lista, detalle, timeline, participantes, evidencias, búsqueda, alta, duplicados | `/api/tickets/...` |
| `tickets/api/time-api.ts` | `time_spans` + 2 RPC | `/api/tickets/:id/time-spans` |
| `tickets/api/transitions-api.ts` | 17 RPC de transición | `POST /api/tickets/:id/actions` |
| `tickets/api/ticket-operations.ts` | Registro de 19 operaciones para cola offline | Mapa de acciones del cliente al endpoint nuevo |
| `tickets/api/rpc.ts` | Helper de error de RPC | Sustituir por cliente HTTP |
| `lib/offline/tus.ts` | Endpoint `storage/v1/upload/resumable` | Endpoint TUS `/api/uploads` |
| `lib/offline/image.ts` | Compresión en canvas | Conservar; el servidor vuelve a normalizar |
| `lib/supabase.ts` | Cliente Supabase | `lib/api-client.ts` |

**Hallazgo:** `fetchDuplicateTickets` en `metrics/api/metrics-api.ts` pasa `filterParams(filters)` dos
veces a `supabase.rpc`. Es un defecto actual que se corregirá al portar la llamada; no se corrige
ahora.

### 1.4 RLS, funciones y permisos

- **41 sentencias de `enable row level security`** (40 tablas; una se repite) y **33 políticas**.
- **32 claves foráneas a `auth.users`** en 12 migraciones.
- **117 usos de `auth.uid()`**.
- **53 funciones `security definer`**.

Grupos de políticas:

| Grupo | Tablas | Criterio actual |
|---|---|---|
| Lectura de tiquets | `tickets`, `ticket_events`, `ticket_assignments`, `ticket_participants`, `ticket_captures`, `evidence`, `ticket_pauses`, `ticket_pause_steps`, `ticket_claims`, `ticket_links`, `time_spans`, `ticket_ratings` | `can_see_ticket(ticket_id)` / `ticket.view` |
| Lectura de catálogos | catálogos, `instance_settings`, `roles`, `permissions`, etc. | `authenticated` / `true` |
| Escritura administrativa | catálogos, configuración, calendarios, roles, usuarios, ámbitos, importación | `has_permission(auth.uid(), …)` |
| Notificaciones | `notifications`, `push_subscriptions` | destinatario propio |
| Storage | `storage.objects` del bucket `evidence` | `can_see_ticket` y ruta `tickets/<id>/...` |

Funciones de autorización que desaparecen o se sustituyen:

- `has_permission(uuid, text)`, `require_permission(text)`, `can_see_ticket(uuid)`.
- `can_act_on_behalf(uuid)`, `require_technician_action(...)`.
- `me()`, `profile_update(...)`.

**Consecuencia:** sin RLS, el rol de base de datos de la aplicación podría leer todo. La mitigación
no es confiar en el cliente: es que **solo el servidor** tenga credenciales de base y que todas las
consultas de tiquets pasen por repositorios con alcance. Se puede añadir RLS como refuerzo más
adelante sin rediseñar.

### 1.5 Storage y evidencias

- Bucket privado `evidence`, límite de 50 MiB, tipos MIME de imagen/PDF.
- Políticas sobre `storage.objects` que exigen `can_see_ticket(ticket_id)` y ruta
  `tickets/<ticket>/<cycle>/<uuid>.<ext>`.
- `evidence-api.ts` genera URL firmada de 600 s.
- `offline-evidence.ts` sube con TUS al endpoint de Supabase Storage y luego llama `evidence_add`.
- `lib/offline/image.ts` comprime en el dispositivo (lado mayor 1600 px, JPEG 0.8).
- **No hay generación de miniaturas en servidor ni eliminación garantizada de EXIF**: la
  re-codificación del canvas suele descartar metadatos, pero no es una garantía de servidor.
- No hay volumen de evidencias en el compose actual; el archivo vive en Supabase Storage.

### 1.6 Tiempo real

- `supabase/config.toml` tiene `[realtime] enabled = true`, pero **no hay ninguna suscripción
  `.channel()` ni `postgres_changes` en el frontend**.
- No hay publicación de Realtime configurada en las migraciones.
- Las mutaciones invalidan TanStack Query solo en la pestaña que las ejecuta. Otra persona no ve el
  cambio sin recargar.
- **Esto es una carencia actual**, no una pieza que se pueda “conservar” tal cual. La migración debe
  implementarla con `LISTEN/NOTIFY` + SSE.

### 1.7 Edge Functions y tareas programadas

- `supabase/functions/` no existe. `docs/notificaciones-push.md` describe una futura función
  `notify-push`, pero no está implementada.
- No se encontraron `pg_cron`, `pg_net` ni llamadas programadas.
- `notification_rules` y `escalation_rules` existen y la semilla las llena; no hay job que las
  evalúe.
- `push_subscriptions` existe, pero no hay código de registro ni de envío.
- `docs/notificaciones-push.md` y el ADR 0035 describen la activación futura.

### 1.8 Semillas, scripts, CI y despliegue

- `supabase/seed.sql` tiene **928 líneas** e incluye configuración, permisos, roles, reglas,
  catálogos, técnicos, solicitantes, usuarios de `auth.users` con contraseña fija, ámbitos,
  calendarios, festivos, motivos y ~20 tiquets de demostración con eventos/ofertas/reclamaciones.
- `scripts/bootstrap.sh` levanta Supabase y termina mostrando usuarios y contraseña fija.
- `scripts/write-local-env.mjs` obtiene URL y clave anónima de `supabase status`.
- `scripts/clean-test-data.mjs` usa el contenedor `supabase_db_*` y desactiva disparadores.
- `scripts/check-agnostic.mjs` permite `supabase/functions/integration-*/**` y busca solo
  `atenda`, `google sheets` y `google drive`.
- CI levanta Supabase, genera `.env.local`, instala Chromium y ejecuta `pnpm check`.
- `deploy/` define `web` + `migrate`, usa la CLI de Supabase y el compose oficial de Supabase.
- `deploy/.env.example`, `.env.production.example` y `deploy/supabase/.env.example` contienen
  **nombres** de variables y valores de ejemplo, no secretos reales.

### 1.9 Documentación afectada

| Documento | Cambio |
|---|---|
| `AGENTS.md` | Nueva arquitectura, dependencias, Drizzle, servidor, sin RLS, pruebas, límites |
| `docs/convenciones-codigo.md` | Estructura de `apps/server`, capa de datos, autorización, Vitest, secretos |
| `docs/configuracion-inicial.md` | Reemplazar Supabase por Docker Compose, Drizzle, variables e instalación |
| `docs/dominio.md` | Solo referencias a RLS/Storage/Supabase |
| `docs/especificacion-negocio.md` | Solo referencias a RLS/Storage/Supabase; reglas intactas |
| `docs/modelo-datos.md` | FKs a `auth.users`, RLS, seeds y plan de migraciones |
| `docs/notificaciones-push.md` | Reemplazar Edge Functions/SMTP por servidor, push y scheduler |
| `docs/empezar-aqui.md` | Arranque sin Supabase, usuarios demo sin contraseña fija |
| `docs/ESTADO.md` | Estado, bloqueos y registro de la migración |
| `README.md` | Requisitos, arranque, scripts y usuarios demo |
| `docs/decisions/` | Nuevos ADR y sustitución de los que dependen de Supabase |
| `docs/integraciones-y-migracion.md` | Adaptador y procesos del servidor |

### 1.10 Hallazgos y discrepancias que deben decidirse antes de implementar

1. **No hay Realtime ni push implementados**; el requisito se construye, no se migra.
2. **No hay datos reales** que conservar; la instalación puede ser limpia.
3. **Contraseña fija de demostración** en README, docs, scripts, e2e, visual y semilla. Debe
   eliminarse; no se reproduce aquí.
4. **`idempotency_keys` no se usa**; las RPC usan eventos. Hay que definir el contrato único.
5. **`fetchDuplicateTickets` pasa filtros dos veces**; corregir al portar.
6. **`profiles` no guarda correo**; el correo vive en `auth.users`. El nuevo modelo no lo necesita.
7. **El cliente no tiene una pantalla de primer arranque**; hay que añadirla.
8. **No hay UI de notificaciones ni de push**; hay que añadir bandeja y activación opcional.
9. **La autorización de métricas depende de RLS** (`security invoker`); sin RLS hay que añadir
   parámetros de alcance a las funciones/vistas.
10. **No hay una capa de consultas con alcance**; hay que crearla y prohibir lecturas directas de
    tiquets fuera de ella.

## 2. Mapa de reemplazo y riesgos

| Supabase | Reemplazo | Riesgo | Mitigación |
|---|---|---|---|
| Supabase Auth | Sesiones opacas en PostgreSQL, Argon2id, CSRF, bloqueo de intentos | Alto | Servicio de auth con pruebas de sesión, revocación y primer arranque |
| PostgREST + `supabase-js` | Fastify + rutas Zod + `api-client` | Alto | Contratos compartidos, errores uniformes, pruebas de contrato |
| RLS | `can(actor, permiso, contexto)` + repositorios con alcance | Alto | Matriz de pruebas por rol, 404 opaco, lint contra lecturas directas |
| RPC de transición | Servicios TypeScript transaccionales | Muy alto | Port 1:1, `FOR UPDATE`, idempotencia, pruebas de concurrencia |
| Storage + TUS | Volumen + TUS propio + Sharp | Alto | Validar contenido, EXIF, cuota, entrega autenticada |
| Realtime | `LISTEN/NOTIFY` + SSE | Alto | Hub SSE, filtro por ticket, heartbeat, reconexión y catch-up |
| Edge Functions | Rutas/procesos del servidor | Bajo | No hay funciones actuales |
| `pg_cron` | Planificador en proceso con advisory lock | Medio | Idempotencia, no solapamiento, registro de ejecuciones |
| `supabase gen types` | Tipos inferidos de Drizzle + Zod | Medio | `drizzle-kit` y `db:check` en la compuerta |
| pgTAP / `supabase test db` | Vitest contra PostgreSQL real (+ pgTAP híbrido si se aprueba) | Medio | Inventario de pruebas y paridad |
| Studio | pgAdmin/DBeaver externos | Bajo | Documentar; no incluir contenedor |
| Compose de Supabase | `db` + `migrate` + `app` | Medio | Healthchecks, migración bloqueada, secretos generados |
| Semilla actual | Referencia + demostración separadas | Medio | Scripts idempotentes y bandera explícita |

### 2.1 Dependencias propuestas (verificadas en el registro)

| Paquete | Versión observada | Licencia | Uso |
|---|---:|---|---|
| `fastify` | 5.12.7 | MIT | Servidor HTTP único |
| `@fastify/static` | 10.1.6 | MIT | Interfaz compilada |
| `@fastify/cookie` | 11.1.3 | MIT | Cookies de sesión |
| `@fastify/csrf-protection` | 8.0.2 | MIT | CSRF; se combinará con `Origin` |
| `@fastify/helmet` | 13.2.0 | MIT | Cabeceras |
| `@fastify/rate-limit` | 11.2.1 | MIT | Límite de acceso y endpoints costosos |
| `drizzle-orm` | 0.45.4 | Apache-2.0 | Acceso y tipos |
| `drizzle-kit` | 0.31.11 | MIT | Migraciones y `db:check` |
| `pg` | 8.23.1 | MIT | Pool de PostgreSQL |
| `@node-rs/argon2` | 2.2.2 | MIT | Argon2id con binarios precompilados |
| `sharp` | 0.35.5 | Apache-2.0 | Normalización, EXIF y miniaturas |
| `@tus/server` | 2.4.6 | MIT | Subida reanudable (Node ≥20.19) |
| `@tus/file-store` | 2.1.1 | MIT | Almacén TUS en disco |
| `zod` | 4.6.7 | MIT | Contratos compartidos |
| `pino` | 10.4.0 | MIT | Registros |
| `file-type` | 22.2.0 | MIT | Tipo por contenido (Node ≥22) |
| `@block65/webcrypto-web-push` | 2.0.0 | MIT | Web Push RFC 8291 sin `web-push` |

`web-push` 3.6.7 es MPL-2.0, licencia que no está en la lista permitida de `AGENTS.md`; por eso se
propone `@block65/webcrypto-web-push` (MIT, publicado en 2026 y compatible con Node). Si se prefiere
`web-push`, hay que aprobar expresamente la excepción de licencia. `@tus/server` exige Node ≥20.19;
el entorno actual es Node 24.18. PostgreSQL objetivo: 17 estable fijado en la imagen.

## 3. Esquema propuesto: usuarios, sesiones, permisos y notificaciones

### 3.1 Usuarios

Se renombra `profiles` a `users` y deja de depender de `auth.users`:

```
users
  id uuid PK default gen_random_uuid()
  username text not null
  username_normalized text not null -- lower(username), único
  full_name text not null
  phone text null
  password_hash text not null
  must_change_password boolean not null default false
  active boolean not null default true
  failed_login_attempts integer not null default 0
  locked_until timestamptz null
  last_login_at timestamptz null
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

- `username_normalized` se mantiene con un disparador o en el servicio; índice único.
- No hay `email`.
- `phone` es el contacto opcional que usa el tiquet; no se usa para enviar nada.
- `must_change_password` fuerza el cambio tras un restablecimiento.
- El último administrador activo no se puede desactivar ni degradar.

### 3.2 Sesiones e intentos

```
sessions
  id uuid PK
  user_id uuid FK users
  token_hash text not null unique -- HMAC/SHA-256 del token opaco
  csrf_token_hash text not null
  created_at timestamptz
  last_seen_at timestamptz
  expires_at timestamptz
  revoked_at timestamptz null
  ip text null
  user_agent text null

login_attempts
  id bigint identity PK
  username_normalized text not null
  ip text null
  success boolean not null
  created_at timestamptz not null default now()
```

- Token opaco de 32 bytes, nunca en `localStorage`; cookie `HttpOnly`, `SameSite=Lax`, `Secure` en
  HTTPS.
- CSRF: token por sesión, devuelto por `/api/me`, enviado en `X-CSRF-Token`; además se valida
  `Origin` en toda mutación.
- Expiración absoluta configurable (propuesta: 7 días) y por inactividad (propuesta: 24 horas).
- Cambio/restablecimiento de contraseña revoca todas las sesiones; el login rota el token.
- Desactivar un usuario revoca sus sesiones de inmediato.

### 3.3 Roles, permisos y ámbitos

Se conservan `permissions`, `roles`, `role_permissions`, `user_roles`, `supervisor_scopes`,
`supervisor_scope_buildings`, `technician_categories` y la semántica de `permission_scope`
(`own`, `team`, `buildings`, `all`). Solo cambian las FKs de usuario y desaparecen las políticas RLS.
La matriz de permisos de `docs/modelo-datos.md` sigue siendo la fuente de verdad.

### 3.4 Notificaciones y push

```
notifications
  id uuid PK
  recipient_user_id uuid FK users
  recipient_requester_id uuid FK requesters null
  ticket_id uuid FK tickets
  event_id bigint FK ticket_events
  type event_type
  channel notification_channel -- in_app | push (sin email/sms)
  payload jsonb
  read_at timestamptz null
  created_at timestamptz

notification_deliveries
  id uuid PK
  notification_id uuid FK notifications
  channel notification_channel
  status text -- pending | sent | failed | abandoned
  attempts integer
  last_error text
  next_attempt_at timestamptz
  sent_at timestamptz
  created_at timestamptz
  unique (notification_id, channel)

push_subscriptions
  id uuid PK
  user_id uuid FK users
  endpoint text unique
  p256dh text
  auth text
  user_agent text
  created_at timestamptz
  updated_at timestamptz
```

- El canal `email` y `sms` desaparece del enum; no hay envío por correo.
- Para solicitantes sin cuenta no hay bandeja ni push; se conserva `recipient_requester_id` solo como
  registro interno si se decide, pero no hay entrega.
- El push se encola en la misma transacción del evento; el envío se hace después, con reintentos y
  eliminación de suscripciones inválidas (`404`/`410`).

### 3.5 Evidencias

Se conserva `evidence` y se añade:

```
storage_path text not null       -- clave final en el volumen
thumbnail_path text null
sha256 text not null
width integer null
height integer null
mime_type text not null
size_bytes bigint not null
processing_state text not null   -- pending | ready | failed
```

- No se borran evidencias (disparador existente).
- La ruta la genera el servidor; nunca se confía en la ruta del cliente.
- La entrega exige `canSeeTicket` y se hace por streaming autenticado.

### 3.6 Idempotencia

Se extiende `idempotency_keys`:

```
client_request_id uuid PK
actor_id uuid FK users null
operation text not null
ticket_id uuid FK tickets null
request_hash text not null
response jsonb null
created_at timestamptz not null default now()
```

- Cada acción del cliente usa `Idempotency-Key`/`clientRequestId`.
- Dentro de la transacción se inserta la clave; si ya existe, se devuelve el resultado previo
  (`duplicate`) sin repetir efectos.
- Las evidencias y los eventos también conservan su `client_request_id` para compatibilidad de
  datos.

### 3.7 Tablas que cambian por FKs

Las siguientes referencias a `auth.users` pasan a `users`:

`user_roles`, `supervisor_scopes`, `requesters.user_id`, `technicians.user_id`,
`tickets.registered_by`, `ticket_events.actor_id`, `ticket_events.subject_user_id`,
`ticket_assignments.assignee_user_id`, `ticket_assignments.assigned_by`,
`ticket_captures.changed_by`, `ticket_captures.captured_by_user_id`,
`ticket_captures.uploaded_by`, `ticket_offers.supervisor_user_id`,
`ticket_validations.validator_user_id`, `ticket_pauses.opened_by`,
`ticket_pauses.recorded_by`, `ticket_pause_steps.actor_id`, `ticket_claims.opened_by`,
`ticket_claims.resolved_by`, `ticket_links.created_by`, `time_spans.recorded_by`,
`time_spans.voided_by`, `ticket_ratings.rated_by`, `notifications.recipient_user_id`,
`push_subscriptions.user_id`, `import_batches.created_by`,
`integration_tasks.assigned_to`, `integration_tasks.created_by`,
`idempotency_keys.actor_id`.

El resto de tablas, columnas, enums, restricciones e índices se conserva. Se eliminan las políticas
RLS y los `grant` a `anon`/`authenticated`/`service_role`; los permisos de base se reducen a dos
roles propios.

### 3.8 Conexiones y rendimiento

- La aplicación usa un único `pg.Pool` acotado (propuesta: máximo 10 conexiones, `idleTimeoutMillis`
  30 s). No se añade PgBouncer para decenas de usuarios: el pool del proceso es suficiente.
- Si en el futuro hay varias instancias o cientos de usuarios, PgBouncer en modo `transaction` es la
  ampliación natural, sin cambiar el esquema; no entra en este despliegue.
- Revisar con `EXPLAIN (ANALYZE, BUFFERS)` las consultas de bandeja, detalle, timeline, métricas,
  notificaciones y sesiones. Los índices nuevos sobre una base con datos se crean con
  `CREATE INDEX CONCURRENTLY` en migraciones no transaccionales.
- `shared_buffers` se ajusta al 25 % de la RAM del servidor dedicado; para una instalación pequeña,
  un valor conservador (256 MB) y `work_mem` moderado. Documentar el ajuste en el runbook, no
  incrustarlo en la imagen.
- Autovacuum se mantiene; las tablas de sesiones, intentos y entregas tienen limpieza programada.
  No se depende de autovacuum para el mantenimiento de esas colas.

### 3.9 Índices mínimos a revisar

- `users (username_normalized)` único; `sessions (token_hash)` único;
  `sessions (user_id, revoked_at)`; `login_attempts (username_normalized, created_at)`.
- `tickets (status, reported_at)`, `tickets (team_id, status)`, `tickets (building_id, status)`,
  `tickets (category_id, status)`.
- `ticket_events (ticket_id, occurred_at)`, `ticket_events (id)` para catch-up SSE.
- `notifications (recipient_user_id, read_at)`;
  `notification_deliveries (status, next_attempt_at)`.
- `evidence (ticket_id, cycle)`, `time_spans (ticket_id, cycle)`.
- `idempotency_keys (actor_id, created_at)`.
- Revisar con `EXPLAIN (ANALYZE, BUFFERS)` las consultas de bandeja, detalle, timeline, métricas y
  notificaciones. Para índices nuevos en una base con datos, usar `CREATE INDEX CONCURRENTLY` en
  migraciones no transaccionales; en la base inicial se pueden crear de forma normal.

## 4. Diseño de autorización, tiempo real y modo sin conexión

### 4.1 Autorización central

Servicio único, por ejemplo `can(actor, permiso, contexto)`:

- `actor`: usuario de sesión con `userId`, roles, permisos con ámbito, `technicianId`,
  `requesterId`, equipos y edificios de sus ámbitos.
- `contexto`: ticket, estado, equipo, edificio, categoría, solicitante, técnico, participación.
- Reglas: permiso del rol + ámbito (`own`, `team`, `buildings`, `all`) + condiciones del estado.
- Visibilidad de ticket: la misma semántica de `can_see_ticket` actual:
  - `ticket.view` con `all`; o
  - solicitante vinculado; o
  - técnico asignado o participante activo; o
  - supervisor del equipo y edificio; o
  - administrador.
- Toda consulta y acción pasa por el servicio. Las respuestas fuera de alcance son **404**, no 403,
  para no revelar existencia.
- Se prohíbe leer tablas de tiquets fuera de `repositories/tickets-scoped.ts`. Se implementará una
  regla de lint/sintaxis y una revisión de dependencias; las rutas y servicios no reciben un
  `QueryBuilder` libre.
- Se aplica a: lectura, historial, búsqueda, exportaciones, evidencias y miniaturas, difusión SSE,
  enlaces de push, descargas y acciones offline tardías.
- **Sin RLS** en esta versión. El rol `axia_app` solo lo usa el servidor; no hay cliente directo a la
  base. RLS queda como refuerzo opcional documentado.

Matriz de pruebas (se generará desde la matriz de `docs/modelo-datos.md`):

| Rol | Caso permitido | Casos negativos obligatorios |
|---|---|---|
| Solicitante | Su tiquet, su calificación, su reclamación | Otro solicitante; tiquet sin vínculo; usuario inactivo |
| Técnico | Tiquet asignado o participación activa; sus acciones | Otro equipo; otro tiquet; evidencia ajena; usuario inactivo |
| Supervisor | Equipo + edificio del ámbito; ofertas propias | Otro edificio; otro equipo; tiquet fuera de ámbito; usuario inactivo |
| Administrador | Todo, con guardarraíl de último administrador | Rol administrativo degradado; auto-desactivación; usuario inactivo |
| Archivos | Evidencia de ticket visible | Evidencia de ticket ajeno; ruta absoluta; archivo inexistente |
| SSE | Evento de ticket visible | Evento de ticket ajeno; sesión revocada; usuario inactivo |
| Exportación/búsqueda | Mismos filtros que la lectura | Filtros que amplían el ámbito; IDs del cuerpo usados como autoridad |

Cada permiso y cada estado relevante tendrá caso permitido y denegado. Las pruebas negativas de
otro equipo, otro edificio, otro solicitante y usuario desactivado son obligatorias.

### 4.2 Tiempo real con `LISTEN/NOTIFY` + SSE

- Al confirmar una transacción que crea un evento o notificación, se ejecuta `pg_notify` con un
  payload pequeño: `{ eventId, ticketId, type, occurredAt }`. Solo identificadores; sin datos
  sensibles.
- Un proceso del servidor mantiene una conexión `LISTEN` dedicada (no el pool) y reconecta si falla.
- El hub SSE mantiene conexiones de navegador. Cada evento se filtra por `canSeeTicket(actor,
  ticketId)` antes de enviarse.
- Endpoint `GET /api/events` (SSE): `Content-Type: text/event-stream`, `Cache-Control: no-cache,
  no-transform`, `X-Accel-Buffering: no`, heartbeat cada 15 s.
- El cliente usa `EventSource` (una conexión por pestaña) con reconexión y backoff. Al reconectar
  llama a `GET /api/events/changes?since=<lastEventId>` para recuperar lo perdido e invalida
  TanStack Query.
- Se difunden: bandejas, detalle, ofertas y contador de notificaciones.
- Documentar la configuración del proxy/túnel: sin buffering, timeouts mayores al heartbeat, no
  comprimir SSE.
- Pruebas: dos sesiones, cambio visible sin recargar; una sesión sin permiso no recibe nada;
  reconexión y catch-up.

### 4.3 Modo sin conexión

Se conserva Dexie y la cola, pero cambia el destino y el contrato.

**Elemento de cola** (ampliación del actual):

```
OutboxItem {
  id, seq, type, payload,
  clientRequestId,
  ticketId,
  occurredAt,          // hora del dispositivo
  state, attempts, lastError, result
}
```

**Endpoint** `POST /api/sync/actions`:

```json
{
  "items": [
    {
      "clientRequestId": "uuid",
      "ticketId": "uuid",
      "type": "pause",
      "args": { "...": "..." },
      "occurredAt": "2026-10-18T18:00:00.000Z"
    }
  ]
}
```

Respuesta por ítem:

```json
{
  "clientRequestId": "uuid",
  "status": "applied | duplicate | rejected | conflict | blocked",
  "code": "opcional",
  "message": "opcional",
  "currentState": "opcional",
  "eventId": "opcional"
}
```

Reglas:

- Se procesa **en orden por tiquet**; un `rejected` o `conflict` detiene los ítems dependientes de
  ese tiquet y los marca `blocked` con `blockedBy`.
- Nunca se descarta una acción en silencio: el cliente muestra el resultado y permite reintentar,
  descartar o abrir el tiquet.
- `occurredAt` se valida: no anterior a la creación del tiquet, no más de 5 minutos en el futuro,
  no más de 30 días de antigüedad; tolerancia configurable. El servidor guarda `recordedAt` con su
  reloj.
- Las acciones se ejecutan con el mismo servicio transaccional y la misma idempotencia que las
  acciones en línea.
- Evidencias: se suben aparte con TUS; el evento/acción que las requiere se ejecuta después de que
  la evidencia esté `ready`. Si la subida falla, la acción queda bloqueada con
  `evidence_pending`, no se aplica a medias.
- Disparadores de sincronización: abrir la app, `online` y `visibilitychange`; no se depende de
  Background Sync.
- Prueba Playwright: técnico sin red registra evidencia, pausa y atendido; al volver la red se
  sincroniza; un conflicto se muestra al usuario.

### 4.4 Contrato de la API

- Zod compartido en `packages/shared` para entradas y respuestas.
- Errores: `{ error: { code, message, details? } }`; `400` validación, `401` sin sesión, `403`
  operación no permitida, `404` fuera de alcance, `409` conflicto de estado, `413` archivo
  excesivo, `415` formato inválido, `500` sin secretos.
- `Idempotency-Key` en acciones; `clientRequestId` también en el cuerpo para la cola.
- Toda mutación exige `Origin` válido y `X-CSRF-Token`.
- Ningún `actor_id`, `created_by`, estado o permiso del cuerpo se usa como autoridad.
- `lib/api-client.ts` centraliza `fetch`, `credentials: 'include'`, `X-CSRF-Token`, el sobre de
  errores y la cancelación. La sesión no se guarda en `localStorage`; `AuthProvider` consulta
  `/api/me` y limpia TanStack Query al cerrar sesión.
- Reglas de dependencia nuevas: `apps/web` no importa `apps/server` ni la base; `apps/server` no
  importa `apps/web`; `packages/shared` solo contiene contratos Zod y tipos puros; la web solo habla
  con la API por `features/*/api` y `lib/`.

## 5. Inventario de pruebas actuales y destino

### 5.1 Totales

| Suite | Archivos | Pruebas/aseveraciones | Destino |
|---|---:|---:|---|
| Vitest | 42 | 237 | Se conservan casi todos; adaptar auth, runtime, offline y mocks de Supabase |
| Playwright | 11 | 16 | Se conservan; cambiar login a usuario y añadir SSE/conflicto offline |
| pgTAP | 30 | 466 aserciones | Híbrido propuesto: conservar invariantes de BD; portar RPC/RLS a Vitest |
| Visual | 2 | 2 | Adaptar login; ampliar a admin, móvil y oscuro |

### 5.2 pgTAP por archivo

| Archivo | Plan | Cobertura | Destino propuesto |
|---|---:|---|---|
| `00_humo.test.sql` | 1 | Esquema público | Eliminar; sustituir por prueba de migración |
| `10_catalogs.test.sql` | 44 | Catálogos, motivos, restricciones, `pg_trgm` | Conservar pgTAP |
| `20_users_roles.test.sql` | 28 | Usuarios, roles, ámbitos | Portar a Vitest de auth/autorización (las FKs cambian) |
| `30_tickets_and_history.test.sql` | 23 | Tiquets, folio, historial, disparadores | Conservar invariantes; portar alta/eventos a Vitest |
| `40_routing_transitions.test.sql` | 27 | Ruteo, ofertas y transiciones | Portar a Vitest de servicios |
| `50_pauses_claims_links.test.sql` | 32 | Pausas, recaptura, reclamaciones, enlaces | Portar a Vitest de servicios |
| `60_time_spans.test.sql` | 12 | Disparador de tramos y cálculos | Conservar pgTAP |
| `70_notifications.test.sql` | 13 | Reglas, notificaciones, escalamiento | Conservar trigger; portar lectura a Vitest |
| `80_rls_visibility.test.sql` | 10 | Visibilidad por RLS | Reemplazar por matriz Vitest de autorización |
| `83_labor_time.test.sql` | 15 | Tiempo laboral | Conservar pgTAP |
| `84_metrics_views.test.sql` | 31 | Vistas de indicadores | Conservar; añadir alcance |
| `85_labor_extra.test.sql` | 12 | Tiempo extra | Conservar pgTAP |
| `86_calendar_admin.test.sql` | 15 | Escritura de calendarios por RLS | Portar a Vitest de administración |
| `87_duplicate_metrics.test.sql` | 4 | Duplicados en métricas | Conservar; añadir alcance |
| `88_ratings.test.sql` | 8 | Calificaciones | Conservar vista; portar `ticket_rate` |
| `89_sla.test.sql` | 10 | SLA | Conservar; añadir alcance |
| `90_auth_profiles.test.sql` | 25 | Perfil y `auth.users` | Portar a Vitest de auth |
| `90_import.test.sql` | 14 | Importación | Portar a Vitest de importación |
| `91_import_assign.test.sql` | 5 | Asignación importada | Portar a Vitest |
| `92_metrics_verification.test.sql` | 14 | Verificación numérica de métricas | Conservar pgTAP |
| `93_import_timeline.test.sql` | 6 | Timeline importada | Portar a Vitest |
| `94_integration_tasks.test.sql` | 7 | Tareas de convivencia | Portar a Vitest |
| `95_flow_completion.test.sql` | 38 | Evidencia y flujo completo | Portar a Vitest de servicios/archivos |
| `96_timeline_view.test.sql` | 7 | Vista de timeline | Conservar vista; adaptar alcance |
| `97_admin_writes.test.sql` | 18 | Escrituras administrativas por RLS | Reemplazar por Vitest de administración |
| `98_manual_time.test.sql` | 9 | Tiempos manuales | Portar a Vitest |
| `99_technician_proxy.test.sql` | 11 | Proxy del técnico | Portar a Vitest |
| `100_evidence_state.test.sql` | 5 | Evidencia por estado | Portar a Vitest de evidencias |
| `101_evidence_permissions.test.sql` | 4 | Permisos de evidencia | Reemplazar por matriz de autorización |
| `110_catalog_import.test.sql` | 18 | Importación de catálogos | Portar a Vitest de importación |

**Nota:** si se aprueba el híbrido, pgTAP se ejecuta con `pg_prove` o un runner TAP en el contenedor
de pruebas, nunca con `supabase test db`. Si se prefiere una sola herramienta, los archivos marcados
“conservar” se portan a Vitest y se elimina pgTAP.

### 5.3 Vitest por grupo

| Grupo | Archivos | Destino |
|---|---|---|
| `features/admin/domain` | 10 | Se conservan; adaptar tipos de `Profile`/`User` |
| `features/auth/domain`, `schemas` | 3 | Adaptar login por usuario y respuesta de sesión |
| `features/catalogs/domain` | 1 | Se conserva |
| `features/dashboard/domain` | 1 | Se conserva |
| `features/integrations/domain` | 1 | Se conserva |
| `features/metrics/domain` | 3 | Se conservan; añadir alcance |
| `features/tickets/domain` | 8 | Se conservan |
| `features/tickets/components` | 1 | Se conserva |
| `components/shared` | 2 | Se conservan |
| `lib` (format, sort, theme, time, tones) | 5 | Se conservan |
| `lib/offline` | 4 | Adaptar contrato `OutboxItem` y API |
| `lib/runtime-config` | 1 | Eliminar; ya no hay URL/clave de Supabase |
| `app/router` | 1 | Adaptar mocks de auth/API; ya no usa Supabase |

### 5.4 Playwright

| Archivo | Flujo | Destino |
|---|---|---|
| `auth.spec.ts` | Login, logout, acceso denegado | Cambiar a usuario/contraseña y primer arranque |
| `tickets.spec.ts` | Solicitante registra y ve su tiquet | Conservar; datos de prueba propios |
| `ticket-flow.spec.ts` | Técnico recibe, atiende con evidencias | Conservar; TUS propio |
| `offline.spec.ts` | Evidencia sin conexión y sincronización | Adaptar contrato y añadir conflicto |
| `take-offer.spec.ts` | Supervisor toma oferta | Conservar; login por usuario |
| `take-offer`/`auxiliaries` | Asignación y apoyo | Conservar |
| `pause-substates.spec.ts` | Pausa y subestados | Conservar |
| `reactivate.spec.ts` | Rechazo y reactivación | Conservar |
| `metrics.spec.ts` | Métricas y vista de tiempos | Conservar; añadir alcance |
| `admin.spec.ts` | Catálogo y plantilla | Conservar |
| `admin-roles.spec.ts` | Alta de rol | Conservar |
| `visual.spec.ts` | Capturas | Adaptar login; ampliar cobertura |

Se añadirán pruebas Playwright de:
- primer arranque y creación del administrador;
- realtime: cambio visible en otra sesión y no visible sin permiso;
- sync: acción rechazada/conflicto mostrada al usuario;
- push: activación opcional (si se implementa);
- archivos: descarga autorizada y 404 fuera de ámbito.

### 5.5 Infraestructura de pruebas

- Vitest de servidor con `pg` contra una base PostgreSQL real; migraciones desde cero.
- Una base de prueba (`axia_test`) creada desde una plantilla migrada; tests de servicios con
  transacciones y rollback cuando sea posible; concurrencia con conexiones separadas y fixtures
  únicos.
- Sin mocks de base de datos para servicios y autorización.
- `pnpm db:test` prepara la base, aplica migraciones y ejecuta la suite; `pnpm db:check` compara el
  esquema con Drizzle.
- Si se conserva pgTAP: `pnpm db:test:sql` con `pg_prove`/runner TAP; se ejecuta en CI junto a
  Vitest.

## 6. Auditoría de semillas, datos y secretos

### 6.1 Semilla actual

`supabase/seed.sql` (928 líneas) contiene:

| Bloque | Contenido | Dependencia de Supabase | Reutilizable |
|---|---|---|---|
| Configuración | `instance_settings` singleton | No | Sí |
| Permisos/roles | 36 permisos, 4 roles, matriz de ámbitos | No | Sí |
| Reglas | `notification_rules`, `escalation_rules` | Canales con email/sms | Adaptar |
| Catálogos | equipos, edificios, ubicaciones, dependencias, categorías, subcategorías, problemas, tipos de servicio, prioridades, canales | No | Parcial (referencia/demo) |
| Personas | técnicos, designaciones, solicitantes | No | Demo |
| Usuarios | `auth.users` + `auth.identities` + contraseña fija | **Sí** | No: reemplazar |
| Ámbitos | supervisor + edificios | No | Demo |
| Calendarios | 2 calendarios, franjas, 14 festivos | No | Referencia/demo |
| Motivos | ~62 motivos jerárquicos | No | Referencia |
| Tiquets | ~20 tiquets y eventos/ofertas/reclamaciones | `auth.users` por actores | Demo |

### 6.2 Separación propuesta

| Conjunto | Contenido | Cuándo se ejecuta |
|---|---|---|
| **Referencia** | permisos, roles, matriz de roles, configuración inicial, reglas de notificación/escalamiento, tipos de servicio, prioridades, canales, calendario base y festivos, motivos jerárquicos | Siempre, idempotente; seguro en producción |
| **Demostración** | equipos, edificios, ubicaciones, dependencias, categorías/subcategorías/problemas, solicitantes, técnicos, usuarios ficticios, ámbitos, tiquets de ejemplo | Solo con `--demo`/`SEED_DEMO=1`; se niega si `NODE_ENV=production` o `APP_ENV=production` |

Pregunta abierta: si se quiere que las categorías/equipos iniciales formen parte de referencia o
solo de demostración. Propuesta: referencia mínima (roles, permisos, reglas, motivos, tipos,
prioridades, canales, calendario y festivos); el resto es demo.

### 6.3 Usuarios y contraseñas de demostración

- La semilla actual inserta usuarios en `auth.users` con una contraseña fija versionada. **No se
  reproduce el valor.**
- La nueva semilla de demostración:
  - crea usuarios en `public.users` con `username` (p. ej. `admin`, `supervisor`, `tecnico`,
    `solicitante`);
  - genera contraseñas aleatorias con `crypto.randomBytes` y Argon2id;
  - las imprime **una sola vez** por consola o las toma de `SEED_DEMO_PASSWORD`;
  - exige `--demo` y rechaza producción;
  - no escribe contraseñas en logs persistentes ni en el repositorio.
- Las pruebas Playwright crearán sus usuarios/escenarios con la API o con un fixture propio, no con
  la semilla demo.

### 6.4 Secretos de Supabase a descartar

Inventario solo de **nombres y ubicaciones**, sin valores:

| Secreto | Dónde aparece hoy | Acción |
|---|---|---|
| `VITE_SUPABASE_URL` | `apps/web/.env.example`, `deploy/.env*`, CI, docs | Eliminar |
| `VITE_SUPABASE_ANON_KEY` | `apps/web/.env.local` (ignorado), ejemplos, CI | Eliminar y rotar |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | `deploy/docker/40-axia-config.sh`, `deploy/.env.example` | Eliminar |
| `JWT_SECRET` | `deploy/supabase/.env.example` | Descartar |
| `ANON_KEY` / `SERVICE_ROLE_KEY` | `deploy/supabase/.env.example` | Descartar y rotar |
| `POSTGRES_PASSWORD` / `DASHBOARD_PASSWORD` | `deploy/supabase/.env.example` | Descartar |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `supabase/config.toml` (variables de entorno locales) | Descartar |
| Claves locales de Supabase | `apps/web/.env.local` (ignorado) y `supabase/.temp/start-secrets/.../docker.env` (ignorado) | Borrar; nunca se versionaron |
| Contraseña fija demo | README, docs, scripts, e2e, visual, `supabase/seed.sql`, `docs/ESTADO.md` | Eliminar de todos los archivos |

Comprobaciones realizadas sin leer ni mostrar valores:

- `.env.local`, `supabase/.temp/.../docker.env` y `deploy/supabase/docker/.env` **no están en Git**
  (`git log` no los encuentra); están ignorados.
- En las rutas del historial de Git no aparecen `.env` ni `start-secrets`; en los archivos
  versionados actuales solo hay ejemplos/plantillas y la contraseña fija demo. **No se ha hecho un
  escaneo de todo el contenido histórico**: se hará con `gitleaks` antes de publicar, con
  `fetch-depth: 0`.
- `supabase/config.toml` contiene referencias a variables de entorno, no valores reales.

**Acción de la persona:** rotar o eliminar el proyecto de Supabase y cualquier credencial que se
haya usado fuera del repositorio. No se tocará la nube ni producción desde el agente.

### 6.5 Secretos nuevos y rotación

| Variable | Forma | Generación | Rotación |
|---|---|---|---|
| `POSTGRES_OWNER_PASSWORD` | aleatoria, 32 bytes base64 | `install.sh` | Cambiar rol dueño; recrear `DATABASE_URL` de migración |
| `POSTGRES_APP_PASSWORD` | aleatoria, 32 bytes base64 | `install.sh` | Cambiar rol app; reiniciar `app` |
| `MIGRATION_DATABASE_URL` | URL con rol dueño | `install.sh` | Cambiar contraseña y actualizar `.env` |
| `DATABASE_URL` | URL con rol app | `install.sh` | Cambiar contraseña y reiniciar `app` |
| `SESSION_SECRET` | 32 bytes base64 | `install.sh` | Invalida sesiones (o rota con periodo de gracia) |
| `VAPID_PUBLIC_KEY` | base64url | `install.sh` o `web-push` | Regenerar; las suscripciones antiguas dejan de servir |
| `VAPID_PRIVATE_KEY` | base64url | `install.sh` | Regenerar; no registrar |
| `VAPID_SUBJECT` | URL de contacto (`https://dominio`) | configuración | Cambiar sin afectar datos |
| `APP_ORIGIN` | URL pública | configuración | Cambiar si cambia el dominio |
| `TRUST_PROXY` | `true`/`false` | configuración | Ajustar al proxy |

`.env.example` solo lleva nombres y forma, nunca valores reales. `install.sh` no imprime secretos en
logs; los escribe en `.env` con permisos `600` o los muestra una vez por consola local.

### 6.6 Verificación de secretos

- Añadir `pnpm check:secrets` con `gitleaks` (MIT) o un escáner propio que revise el árbol
  versionado y falle ante patrones de claves, contraseñas y tokens.
- Excluir `.env*` locales y artefactos ignorados; el escaneo debe cubrir el historial de Git en CI
  si se dispone de `fetch-depth: 0`.
- Regla adicional: `check:agnostic` incluye `supabase` y solo permite `docs/decisions/**` y
  `docs/migracion-sin-supabase.md`.

## 7. ADR a crear y sustituir

| ADR | Decisión | Sustituye/afecta |
|---|---|---|
| 0067 | PostgreSQL 17 + Drizzle ORM/Kit, migración base aplanada y equivalencia | 0002, 0015 |
| 0068 | Servidor único Fastify + estáticos + API | 0037 |
| 0069 | Usuarios, sesiones opacas, Argon2id, primer arranque y bloqueo | 0016 |
| 0070 | Autorización central sin RLS y repositorios con alcance | 0015, 0018 |
| 0071 | Tiempo real con `LISTEN/NOTIFY` + SSE | 0002 (Realtime) |
| 0072 | Evidencias en volumen, TUS propio, Sharp y entrega autenticada | 0017, 0019 |
| 0073 | Notificaciones in-app, Web Push con `@block65/webcrypto-web-push` (MIT) y planificador | 0035 |
| 0074 | Contrato de sincronización offline y conflictos | 0004, 0019 |
| 0075 | Compose `db`/`migrate`/`app`, roles, secretos y respaldos | 0032, 0036, 0037 |
| 0076 | Semillas de referencia y demostración; sin contraseñas fijas | 0043 |
| 0077 | Estrategia de pruebas: Vitest contra PostgreSQL real; pgTAP híbrido si se aprueba | 0015, 0018 |

ADR que se sustituyen o ajustan: 0002, 0004, 0006 (independencia, se refuerza), 0010 (roles), 0015,
0016, 0017, 0018, 0019, 0023 (calendarios), 0029-0035 (importación, despliegue, push), 0037,
0043 (semillas), 0044/0045 (evidencias/permisos), 0053 (participantes), 0055 (visibilidad),
0066 (administración).

## 8. Plan de tramos y riesgo

| Tramo | Contenido | Riesgo | Puerta |
|---|---|---|---|
| 1. Base | `apps/server`, Drizzle, esquema, migración base, roles owner/app, `compose.yaml` con `db`/`migrate`, equivalencia | Alto | `pnpm db:check`, migración desde cero, comparación de esquema |
| 2. Servidor mínimo | Fastify, configuración validada, logs, salud, estáticos, `/api/health` | Medio | `pnpm check`, arranque de imagen |
| 3. Auth | usuarios, sesiones, Argon2id, primer arranque, login, cambio/restablecimiento, admin de cuentas | Alto | matriz de auth, Playwright primer arranque/login |
| 4. Autorización | `can`, scopes, repositorios de tickets, 404, matriz de pruebas | Alto | matriz de roles y negativas |
| 5. Dominio/API | portar transiciones, concurrencia, idempotencia, Zod, conectar `features/*/api` | Muy alto | paridad de cada transición y pruebas de concurrencia |
| 6. Archivos | TUS, Sharp, EXIF, miniaturas, entrega autenticada, cuotas | Alto | pruebas de carga/descarga/404 |
| 7. Tiempo real/notificaciones | listener, SSE, bandeja, push, scheduler | Alto | dos sesiones, permisos, push opcional |
| 8. Offline | cola, `occurredAt`, sync, conflictos, evidencia pendiente | Alto | Playwright sin red + conflicto |
| 9. Semillas/instalación | referencia/demo, `install.sh`, secretos, respaldos, CI, limpieza Supabase | Medio | instalación desde cero y `pnpm check` |
| 10. Cierre | docs, ADR, `check:agnostic`, `check:secrets`, eliminar Supabase | Medio | criterios de aceptación completos |

Cada tramo: pruebas, `pnpm check` en verde, commit propio y actualización de `docs/ESTADO.md`. No se
hará `push` ni se tocará producción sin confirmación.

## 9. Preguntas abiertas para la persona

1. **Reparto SQL/TS.** ¿Apruebas conservar en SQL solo los disparadores de historial, tramos y
   fan-out de notificaciones, y mover todas las transiciones, importaciones y acciones a servicios
   TypeScript? **Recomendación: sí.** Es el cambio de mayor esfuerzo.
2. **pgTAP.** ¿Apruebas el híbrido (pgTAP para invariantes de BD y Vitest para servicios) o prefieres
   portar todo a Vitest y eliminar pgTAP? **Recomendación: híbrido justificado en ADR 0077**, salvo
   que quieras una sola herramienta.
3. **Semillas.** ¿La referencia debe incluir categorías/equipos iniciales o solo permisos, roles,
   reglas, motivos, tipos, prioridades, canales, calendarios y festivos? **Recomendación:** la
   segunda; equipos/edificios/categorías/tiquets son demo.
4. **Solicitantes sin cuenta.** Sin correo, un solicitante sin cuenta no puede tener bandeja ni push.
   ¿Aceptamos que solo reciba notificaciones si tiene cuenta vinculada? **Recomendación: sí.**
5. **Contraseñas y sesiones.** ¿Apruebas mínimo 12 caracteres, Argon2id, 7 días absolutos, 24 h de
   inactividad, 5 intentos y bloqueo 15 min? **Recomendación: sí.**
6. **Archivos.** ¿Apruebas 20 MiB por archivo, 4096 px de lado mayor, miniatura 320 px y cuota de
   500 MiB por usuario? **Recomendación: sí**, configurables por entorno.
7. **Push.** ¿Lo implementamos en esta migración (infraestructura + activación opcional) o lo
   dejamos para después? **Recomendación:** infraestructura y bandeja ahora; activación push
   opcional, sin bloquear la migración.
8. **TUS.** ¿Apruebas `@tus/server` + `@tus/file-store` (MIT, Node ≥20.19) o prefieres un esquema
   propio de partes? **Recomendación: TUS**, sin contenedor adicional.
9. **Framework.** ¿Apruebas Fastify 5 (MIT) como servidor único? **Recomendación: sí**, con
   `@fastify/static`, `cookie`, `helmet`, `rate-limit` y `csrf-protection`.
10. **Desfase de reloj offline.** ¿5 minutos de futuro, 30 días de antigüedad y no antes de la
    creación del tiquet? **Recomendación: sí**, configurable.
11. **Límites de alcance.** ¿La autorización debe devolver 404 también para archivos y SSE?
    **Recomendación: sí.**
12. **Supabase Cloud.** ¿Confirmas que puedo ignorar la nube y que tú rotarás/eliminarás el proyecto
    y sus claves? **Recomendación: sí; no tocaré la nube.**
13. **Datos.** ¿Confirmas que no hay datos reales que migrar y que la instalación nace limpia?
    **Recomendación: sí**, según la tarea.

## Apéndice A — Inventario de migraciones SQL

| Archivo | Contenido Supabase/RLS | Acción |
|---|---|---|
| `20261008005955_enable_pgtap.sql` | Extensión pgTAP | Eliminar de la base; pruebas aparte |
| `20261008050813_instance_settings_and_catalogs.sql` | Tablas, enums, `pg_trgm`, RLS, triggers | Portar esquema; quitar RLS; conservar triggers |
| `20261008051005_users_roles_and_scopes.sql` | `profiles` y FKs a `auth.users`, RLS | Crear `users`; cambiar FKs; quitar RLS |
| `20261008051148_tickets_and_history.sql` | FKs `auth.users`, RLS, triggers de folio/historial | Portar; cambiar FKs; quitar RLS; conservar triggers |
| `20261008051341_routing_offers_and_transitions.sql` | RPC de ruteo/transiciones, `auth.uid`, grants | Portar tablas; mover RPC a servicios; quitar grants |
| `20261008051956_pauses_recaptures_claims_links.sql` | FKs `auth.users`, RLS, RPC | Portar tablas; mover RPC; quitar RLS |
| `20261008052413_time_spans.sql` | RLS, trigger de tramos, funciones de tiempo | Conservar trigger/funciones; quitar RLS |
| `20261008052526_notifications_and_escalation.sql` | Reglas, notificaciones, trigger, RPC de lectura | Portar; conservar trigger; mover lectura |
| `20261008053336_rls_visibility_seeds_metrics.sql` | RLS, vistas, semillas | Quitar RLS; portar vistas; separar semillas |
| `20261008090000_auth_profiles_and_identity.sql` | `auth.users`, `auth.uid`, `me`, `profile_update` | Eliminar; auth nueva |
| `20261008091500_evidence_and_flow_completion.sql` | Bucket/policies Storage, `can_see_ticket`, RPC | Eliminar Storage; mover RPC; autorización TS |
| `20261008092000_timeline_view.sql` | Vista con `auth.uid` | Portar vista; filtrar en servicio |
| `20261008093000_admin_write_policies.sql` | Políticas de escritura administrativa | Eliminar; servicios admin |
| `20261008095100_manual_time_attribution.sql` | FKs, RPC de tiempos manuales | Portar tablas; mover RPC |
| `20261008096000_technician_proxy.sql` | `auth.uid`, funciones de proxy | Mover a servicios |
| `20261008130000_teams_work_calendar.sql` | Columna/FK, RLS | Portar; quitar RLS |
| `20261008130100_labor_time.sql` | Funciones de tiempo laboral | Conservar funciones |
| `20261008130200_metrics_views.sql` | Vistas de métricas | Conservar; añadir alcance |
| `20261008140000_labor_extra.sql` | Funciones/vistas extra | Conservar; añadir alcance |
| `20261008150000_calendar_write_policies.sql` | RLS de calendarios | Eliminar; servicio admin |
| `20261008151000_me_timezone.sql` | `me()` | Eliminar; identidad del servidor |
| `20261008160000_duplicate_metrics.sql` | Vistas de duplicados | Conservar; añadir alcance |
| `20261008170000_event_type_rated.sql` | Enum | Conservar |
| `20261008170100_ticket_ratings.sql` | RLS, RPC, vista | Portar tabla; mover RPC; vista con alcance |
| `20261008180000_sla.sql` | Vistas SLA | Conservar; añadir alcance |
| `20261008190000_import_infra.sql` | FKs, RLS, RPC de importación | Portar tablas; mover RPC |
| `20261008200000_import_assign.sql` | RPC | Mover a servicio |
| `20261008210000_import_timeline.sql` | RPC | Mover a servicio |
| `20261008220000_convivencia.sql` | FKs, RLS, RPC | Portar tablas; mover RPC |
| `20261008230000_push_subscriptions.sql` | FK, RLS | Portar; quitar RLS; añadir entregas |
| `20261009090000_evidence_state_rules.sql` | RPC y triggers | Mover RPC; conservar reglas de estado |
| `20261009100000_evidence_attach_and_progress.sql` | RPC | Mover a servicio |
| `20261009110000_metrics_rpc.sql` | RPC `security invoker`/RLS | Conservar cálculo; añadir parámetros de alcance |
| `20261009120000_metrics_duplicates_category.sql` | RPC de métricas | Conservar; añadir alcance |
| `20261009130000_participant_integrity.sql` | RPC y trigger | Conservar trigger; mover RPC |
| `20261009140000_requester_visible_events.sql` | Columna/vista | Conservar; adaptar |
| `20261009150000_classification.sql` | Trigger y RPC | Conservar trigger; mover RPC |
| `20261010120000_catalog_import.sql` | RPC y tablas | Portar tablas; mover RPC |
| `20261010130000_pause_substates.sql` | RPC | Mover a servicio |
| `20261010140000_pause_motive_substates.sql` | RPC | Mover a servicio |
| `20261010150000_pause_resume_descendant.sql` | RPC | Mover a servicio |

## Apéndice B — Funciones/RPC y destino

| Grupo | Funciones | Destino |
|---|---|---|
| Auth/identidad | `me`, `profile_update`, `handle_new_user` | Servicio de auth; eliminar trigger de `auth.users` |
| Autorización | `has_permission`, `require_permission`, `can_see_ticket`, `can_act_on_behalf`, `require_technician_action` | Servicio `authorization` |
| Tiquets | `ticket_create`, `ticket_take`, `ticket_assign_technician`, `ticket_assign_supervisor`, `ticket_add_auxiliary`, `ticket_start`, `ticket_attend`, `ticket_validate`, `ticket_reject`, `ticket_cancel`, `ticket_change_priority`, `ticket_comment`, `ticket_pause`, `ticket_advance_pause`, `ticket_resume`, `ticket_recapture`, `ticket_open_claim`, `ticket_resolve_claim`, `ticket_mark_duplicate`, `ticket_reactivate` | Servicios de transición |
| Ruteo/duplicados | `ticket_route`, `ticket_detect_duplicates`, `ticket_check_duplicates` | Servicios de ruteo/duplicados |
| Tiempos | `time_span_record`, `time_span_void` | Servicio de tiempos |
| Tiempos (cálculo) | `ticket_time_total`, `ticket_time_net`, `ticket_time_by_kind`, `ticket_time_total_laboral`, `ticket_time_net_laboral`, `ticket_time_by_kind_laboral`, `ticket_time_by_kind_extra`, `ticket_calendar`, `work_calendar_overlap` | Conservar SQL |
| Historial/tramos | `write_event`, `ticket_events_record_spans`, `prevent_mutation`, `tickets_*` triggers | Conservar/adaptar (actor explícito) |
| Notificaciones | `notify_event`, `ticket_events_notify`, `notification_mark_read` | Conservar fan-out; mover lectura a servicio |
| Evidencias | `evidence_add` | Servicio de archivos/evidencias |
| Importación | `import_system`, `import_batch_start/finish`, `import_record_add`, `import_alias_get/set`, `import_status_get/set`, `import_ticket_upsert`, `import_ticket_assign`, `import_ticket_timeline` | Servicios de importación |
| Catálogos | `catalog_import_start/finish/sheet` | Servicio de importación de catálogos |
| Convivencia | `integration_task_create/resolve`, `external_status_set` | Servicio de integración |
| Ratings | `ticket_rate` | Servicio de calificación |
| Métricas | `metrics_*` y vistas `v_metrics_*` | Conservar SQL con alcance |
| Varios | `set_updated_at`, `reasons_enforce_same_use`, `tickets_set_folio`, `tickets_check_classification`, `tickets_immutable_fields`, `tickets_close_participants`, `request_already_handled` | Conservar/adaptar; idempotencia nueva |

## Apéndice C — Variables de entorno propuestas

| Variable | Uso |
|---|---|
| `NODE_ENV` | `production`/`development` |
| `APP_ORIGIN` | Origen público para cookies/CSRF |
| `TRUST_PROXY` | Confiar en `X-Forwarded-*` solo detrás de proxy |
| `DATABASE_URL` | Rol de aplicación, mínimo privilegio |
| `MIGRATION_DATABASE_URL` | Rol dueño; solo `migrate` |
| `SESSION_SECRET` | HMAC de tokens de sesión |
| `SESSION_ABSOLUTE_HOURS` | Expiración absoluta |
| `SESSION_IDLE_HOURS` | Expiración por inactividad |
| `PASSWORD_MIN_LENGTH` | Política |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` | Bloqueo |
| `UPLOAD_MAX_BYTES` | Límite por archivo |
| `UPLOAD_MAX_DIMENSION` | Lado mayor de imagen |
| `UPLOAD_THUMBNAIL_PX` | Miniatura |
| `UPLOAD_QUOTA_BYTES` | Cuota por usuario |
| `UPLOAD_DIR` | Volumen de evidencias |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push |
| `PUSH_ENABLED` | Activar envío |
| `APP_PORT` | Puerto interno |
| `LOG_LEVEL` | Pino |
| `SEED_DEMO_PASSWORD` | Opcional, solo demo local; nunca en producción |

## Apéndice D — Orden de lectura sugerido

1. `docs/especificacion-negocio.md` (RN-01 a RN-30).
2. `docs/modelo-datos.md` §3-§11.
3. `docs/ESTADO.md` (fases y bloqueos).
4. `docs/decisions/0002`, `0015`-`0019`, `0029`-`0037`, `0043`, `0066`.
5. `supabase/migrations/` y `supabase/tests/database/` (inventario de este documento).

---

**Fin de la Etapa A.** Con la aprobación de este documento (o los ajustes que indiques) empieza la
Etapa B, tramo por tramo. Hasta entonces no se modifica código de la aplicación.
