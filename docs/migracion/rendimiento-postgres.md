# Rendimiento y mantenimiento de PostgreSQL

**Estado:** base inicial vacía, sin datos ni cargas representativas. Este documento fija el
procedimiento y las decisiones; todavía no afirma que una consulta concreta sea rápida.

## 1. Ajuste de la instancia

`compose.yaml` fija valores conservadores y permite cambiarlos por entorno:

| Parámetro | Valor inicial | Regla |
|---|---:|---|
| `shared_buffers` | `256MB` | En un servidor dedicado, ~25 % de la RAM asignada a la base |
| `effective_cache_size` | `1GB` | ~50–75 % de la RAM del host; es una estimación para el planificador |
| `work_mem` | `8MB` | Moderado; para métricas, usar `SET LOCAL work_mem` en la transacción |
| `maintenance_work_mem` | `128MB` | Suficiente para índices y vacuum de una instalación pequeña |
| `max_connections` | `50` | El pool de la app es de 10; deja margen para migraciones y administración |
| `track_io_timing` | `on` | Necesario para leer `EXPLAIN (ANALYZE, BUFFERS)` con tiempos de E/S |

La imagen está fijada a `postgres:17.11-alpine`. No se incrustan valores de un servidor concreto en
la imagen: se pasan por `.env` o por el orquestador.

Opcional: `pg_stat_statements` para medir consultas acumuladas. Requiere
`shared_preload_libraries=pg_stat_statements` y `CREATE EXTENSION pg_stat_statements`; no se activa
por defecto para no romper instalaciones gestionadas donde no esté disponible.

## 2. Conexiones

- Un único proceso Node usa `pg.Pool` con máximo 10 conexiones. Es suficiente para decenas de
  usuarios y evita añadir PgBouncer prematuramente.
- `LISTEN/NOTIFY` usa una **conexión dedicada**, fuera del pool, con reconexión y re-suscripción.
  No debe consumir una conexión del pool ni participar en transacciones de negocio.
- Si aparecen varias réplicas del servidor, cientos de usuarios o conexiones ociosas, la ampliación
  natural es PgBouncer en modo `transaction` o un pool por réplica más pequeño. No entra en esta
  instalación.
- La migración usa su propia conexión y un advisory lock; no compite con el pool de la app.

## 3. Índices: medir antes de crear

PostgreSQL no indexa automáticamente las columnas de una FK. Eso **no** significa indexarlas todas:
cada índice cuesta escrituras, espacio y vacuum. El orden es:

1. Ejecutar consultas reales de bandeja, detalle, timeline, métricas, notificaciones y sesiones.
2. Medir con `EXPLAIN (ANALYZE, BUFFERS)`.
3. Revisar `pg_stat_user_tables` (`seq_scan`, `idx_scan`, filas muertas) y
   `pg_stat_user_indexes` (`idx_scan`).
4. Añadir solo el índice que cambie el plan y reduzca el coste real.
5. Reejecutar `EXPLAIN` para verificar que se usa.
6. Crear el índice con `CONCURRENTLY` en una migración no transaccional.

El script `pnpm db:next:indexes` lista FKs sin un índice que cubra todas sus columnas, índices no
usados e indicadores por tabla. Es una **herramienta de revisión**, no una orden de crear índices.
En una base vacía o recién reiniciada sus estadísticas no son concluyentes.

Candidatos que ya existen o que se revisarán primero:

- B-tree para `tickets (status, reported_at)`, `ticket_events (ticket_id, occurred_at)`,
  `notifications (recipient_user_id, read_at)`, `sessions (user_id, revoked_at)` y
  `notification_deliveries (status, next_attempt_at)`.
- GIN trigram para búsqueda/duplicados en `tickets.description`; ya está creado.
- BRIN sobre `ticket_events (recorded_at)` **solo** si el volumen y las consultas por rango lo
  justifican. No sustituye al B-tree por `ticket_id`.

No se particiona ninguna tabla todavía. Umbral inicial para revisar `ticket_events`: decenas de
millones de filas o varios GB, con un patrón de consulta por rango de fechas. Si se decide, la clave
primaria y las FKs deben rediseñarse para incluir la clave de partición; no es un cambio cosmético.

### 3.1 Consultas de alcance (tramo 4)

La lista de tiquets usa un predicado de alcance con `EXISTS` sobre asignaciones y participantes.
Las consultas por tiquet se apoyan en los índices existentes `ticket_assignments(ticket_id)`,
`ticket_participants(ticket_id)`, `tickets(team_id)`, `tickets(building_id)` y
`tickets(status, reported_at)`. El timeline filtra por `ticket_id` y ordena por `occurred_at`.

Con los fixtures del tramo 4 (cuatro tiquets) el planificador elige exploraciones secuenciales
porque las tablas son minúsculas; **no es una señal para crear índices**. Antes de producción se
repetirá `EXPLAIN (ANALYZE, BUFFERS)` con volumen representativo. Candidatos a evaluar entonces,
solo si el plan los justifica:

- índices parciales por asignado activo (`assignee_user_id`, `assignee_technician_id` con
  `ended_at is null`);
- índice parcial por participante activo (`technician_id` con `ended_at is null`);
- índice de timeline `(ticket_id, occurred_at, id)`.

No se añadió ninguno en el tramo 4.

## 4. Migraciones no transaccionales

`CREATE INDEX CONCURRENTLY`, `VACUUM` y `REINDEX CONCURRENTLY` no pueden ejecutarse dentro de una
transacción. El runner soporta el marcador:

```sql
-- axia:no-transaction
create index concurrently if not exists idx_ejemplo on public.tickets (status);
```

Reglas:

- Una sola sentencia por archivo no transaccional.
- Debe ser idempotente (`IF NOT EXISTS`), porque si falla después de aplicar parte del trabajo no hay
  rollback automático.
- La migración se registra solo cuando la sentencia termina.
- La migración base y los grants pueden seguir siendo transaccionales.

## 5. Vacuum, analyze y mantenimiento

- Autovacuum se mantiene activo. Las tablas de sesiones, intentos, notificaciones y entregas tienen
  limpieza programada, pero no se depende de ella para el mantenimiento estructural.
- Ejecutar `ANALYZE` después de una semilla grande o de una importación masiva.
- Revisar `n_dead_tup`, `last_autovacuum` y `last_autoanalyze` en `pg_stat_user_tables`.
- No ejecutar `VACUUM FULL` como rutina: bloquea y reescribe la tabla. Primero medir bloat.
- Los respaldos siguen el procedimiento de `pg_dump` + volumen de fotos; no se sustituyen por
  copias en caliente del directorio de datos.

## 6. Consultas y vistas internas

Las vistas de métricas y `v_ticket_timeline` no aplican autorización por sí mismas. **No deben
exponerse desde una ruta HTTP** hasta que el tramo 4/5 implemente `can` y el alcance por repositorio.
Antes de exponerlas, añadir pruebas negativas para otro equipo, otro edificio, solicitante y usuario
inactivo. Un `EXPLAIN` correcto no compensa una fuga de datos.

## 7. Procedimiento de revisión

```bash
# Base de desarrollo con datos representativos
pnpm db:next:indexes
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) <consulta>"
```

Checklist antes de producción:

- [ ] Ejecutar las consultas críticas con datos representativos.
- [ ] Revisar FKs sin índice y decidir cuáles se justifican.
- [ ] Verificar que los índices nuevos se crean con `CONCURRENTLY` y una migración no transaccional.
- [ ] Ajustar `shared_buffers`/`effective_cache_size` a la RAM real del servidor.
- [ ] Comprobar `ANALYZE` tras la semilla o importación.
- [ ] Confirmar que las vistas internas no están publicadas sin alcance.
- [ ] Probar restauración de respaldo y medir el tiempo de recuperación.
