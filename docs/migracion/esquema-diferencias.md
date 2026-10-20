# Equivalencia del esquema — base anterior vs. base autoalojada

**Fecha:** 2026-10-20
**Fuente anterior:** base local de Supabase, esquema `public` (42 migraciones).
**Fuente nueva:** `apps/server/db/migrations/0000_base.sql` aplicada sobre PostgreSQL 17.

## Resumen

| Objeto | Antes | Después | Diferencia intencionada |
|---|---:|---:|---|
| Tablas | 55 | 58 | `profiles` → `users`; se añaden `sessions`, `login_attempts`, `notification_deliveries` |
| Vistas | 16 | 15 | Se elimina `v_ticket_events_requester`; la visibilidad se aplica en la API |
| Funciones | 89 | 31 | Salen las RPC de autenticación, flujo, importación e integración; quedan métricas, tiempos y disparadores |
| Enums | 17 | 17 | `notification_channel` pasa de 4 a 2 valores |
| Políticas RLS | 110 | 0 | La autorización vive en el servidor |
| Tablas con RLS | 55 | 0 | Sin RLS en esta versión; se puede añadir después |
| FKs públicas a cuentas | 33 | 33 | Apuntan a `public.users`, no a `auth.users` |
| Disparadores | 40 | 32 | Se retiran los de `auth`/Storage; se conservan los del núcleo |
| Extensiones | `pg_trgm`, `pgtap`, `pgcrypto`, `uuid-ossp`, `supabase_vault`, `pg_stat_statements` | `pg_trgm` | Solo la extensión necesaria para duplicados |

La comparación se hizo con consultas a `pg_catalog` y `information_schema` sobre ambas bases.
Las 9 FKs internas del esquema `auth` de la plataforma anterior no forman parte del núcleo y
no se cuentan entre las 33 FKs públicas.

## Cambios de tablas

### `profiles` → `users`

Se conserva el contenido del perfil (`full_name`, `phone`, `active`, marcas de tiempo) y se
añaden las columnas de credenciales y ciclo de vida:

- `username` único, normalizado a minúsculas con `CHECK` y `UNIQUE`.
- `password_hash` (Argon2id; nunca se expone).
- `must_change_password`, `password_changed_at`, `last_login_at`.
- El disparador `profiles_set_updated_at` pasa a `users_set_updated_at`.
- Las 33 FKs públicas que apuntaban a `auth.users` apuntan a `public.users`.

### Tablas nuevas

- `sessions`: hash del token, caducidad absoluta y por inactividad, revocación, usuario, agente e IP.
- `login_attempts`: intentos correctos/fallidos por usuario, IP y fecha.
- `notification_deliveries`: cola de entrega con estado, reintentos, próximo intento y error.

### Columnas nuevas

- `evidence`: `thumbnail_path`, `sha256`, `width`, `height`, `processing_state`, `processed_at`,
  `processing_error`. Permiten la subida reanudable y el procesamiento con Sharp.
- `idempotency_keys`: `status`, `response`, `expires_at`. La clave de evento sigue siendo
  `ticket_events.client_request_id`.

### Enums

`notification_channel` queda en `in_app` y `push`. Los valores `email` y `sms` no existen porque
esta versión no envía correo ni SMS.

## Vistas

Se conservan las 15 vistas de métricas, SLA, timeline y base. `v_ticket_timeline` ya no filtra
por `auth.uid()`: devuelve los eventos y la API decide la visibilidad del solicitante. Se elimina
`v_ticket_events_requester`, que era una vista de conveniencia para el cliente anterior.

## Funciones

Se conservan 31 funciones:

- Métricas: `metrics_date_in`, `metrics_dims_in`, `metrics_sla`, `metrics_sla_by_priority`,
  `metrics_satisfaction`, `metrics_pauses_by_reason`, `metrics_duplicate_tickets`,
  `metrics_duplicate_alerts`, `metrics_duplicates_by_dimension`, `metrics_by_technician`,
  `metrics_reject_cancel_by_reason`, `metrics_routing`.
- Tiempo: `work_calendar_overlap`, `ticket_calendar`, `ticket_time_total`, `ticket_time_net`,
  `ticket_time_by_kind`, `ticket_time_by_kind_laboral`, `ticket_time_total_laboral`,
  `ticket_time_net_laboral`, `ticket_time_by_kind_extra`.
- Disparadores y ayudantes: `set_updated_at`, `prevent_mutation`, `reasons_enforce_same_use`,
  `tickets_set_folio`, `tickets_check_classification`, `tickets_immutable_fields`,
  `tickets_close_participants`, `ticket_events_record_spans`, `ticket_events_notify`,
  `notify_event`.

Las 58 funciones restantes se retiraron porque su lógica pasa a servicios TypeScript dentro de
transacciones: autenticación y permisos (`me`, `profile_update`, `has_permission`, …), flujo del
tiquet (`ticket_create`, `ticket_take`, `ticket_pause`, `ticket_validate`, …), tiempos manuales
(`time_span_record`, `time_span_void`), importación (`import_*`, `catalog_import_*`) e
integración (`integration_task_*`, `external_status_set`).

## Disparadores y restricciones

Se conservan los invariantes del núcleo: folio y número inmutables, clasificación coherente,
motivos con el mismo uso que el padre, cierre de participantes, tramos de tiempo derivados de la
bitácora, notificaciones de eventos, historial de solo agregar y evidencias sin borrado.

Se añaden:

- `users_set_updated_at`.
- `notification_deliveries_set_updated_at`.
- Índices de sesiones, intentos de acceso y entregas pendientes.
- `users_username_key` y las comprobaciones de formato/minúsculas.

Se retiraron los disparadores de `auth` y Storage (`on_auth_user_created`, protección de buckets
y objetos), que no existen en el stack nuevo.

## Roles y privilegios

- `axia_owner`: dueño del esquema y de las migraciones. Nunca lo usa la aplicación.
- `axia_app`: login de la aplicación, sin `CREATE` en `public`, sin DDL, sin superusuario.
  - `SELECT` en tablas y vistas.
  - `INSERT/UPDATE` según la tabla; sin `UPDATE` en bitácora, capturas, calificaciones,
    validaciones, intentos de acceso ni permisos.
  - `DELETE` solo en relaciones, sesiones, suscripciones, colas y catálogos administrables.
  - Sin `DELETE` en `ticket_events` ni `evidence`.
  - `EXECUTE` en las funciones del núcleo y `USAGE` en `extensions`.

## Verificación

```bash
MIGRATION_DATABASE_URL=... AXIA_APP_PASSWORD=... pnpm check:next
docker compose -f compose.yaml -f compose.dev.yaml up -d db
docker compose -f compose.yaml -f compose.dev.yaml run --rm migrate
```

Resultados de la implementación:

- `pnpm check:next`: lint, tipos, 3 pruebas unitarias, `drizzle-kit check` y 12 pruebas de
  integración contra PostgreSQL 17.
- Migración desde una base vacía: correcta.
- Segunda ejecución de `migrate`: no reaplica nada.
- Rol `axia_app`: consulta `tickets`, ejecuta métricas y recibe `42501` al intentar DDL.

## Diferencias pendientes de revisar

- Los datos de demostración no se migran; la base nueva nace vacía.
- La visibilidad del solicitante sobre la timeline se implementará en la API (tramo 4/5), no en
  la vista.
- Las funciones de métricas se conservan sin RLS; el servidor deberá pasar el alcance del actor
  antes de exponerlas (tramo 4/5).
- La cola de entrega de notificaciones existe, pero el remitente y Web Push llegan en el tramo 7.
