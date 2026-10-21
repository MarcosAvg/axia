# 0015 — RPC de transición como `security definer` y RLS de lectura

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Las reglas dicen que el tiquet solo cambia por funciones RPC y que toda tabla lleva RLS. Con RPC
`security invoker` habría que escribir políticas de escritura por tabla; con `security definer` la
RLS queda para lectura y la escritura se controla dentro de la RPC (que valida permiso).

## Decisión

Las RPC de transición (y las funciones que mutan a las que llaman) son **`security definer`** con
`search_path` fijo (`public, extensions, pg_temp`) y `revoke execute from public` + `grant execute
to authenticated`. Cada RPC valida el permiso con `has_permission`. La **RLS** se usa para
**lectura**: catálogos legibles por autenticados; tiquets y sus tablas según `can_see_ticket`
(permiso + ámbito); notificaciones solo para su destinatario.

## Alternativas consideradas

- **RPC `security invoker` + políticas de escritura por tabla:** correcto pero mucho más
  trabajo y con riesgo de sobre-conceder.

## Consecuencias

- El cliente no puede escribir tablas directamente (no hay políticas de escritura): solo lee y usa
  las RPC.
- El `search_path` fijo evita ataques de secuestro de esquema en funciones definer.
- Justifica la excepción que las convenciones piden para `security definer`.