# 0018 — Escritura de administración por RLS (ajuste del ADR 0015)

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

El ADR 0015 fijó que la RLS del núcleo es **de solo lectura** y que toda escritura pasa por RPC
(`security definer`) que valida permiso. Eso encaja con las **transiciones del tiquet**, pero la
Fase 3B necesita CRUD de **datos de configuración** (catálogos, motivos, roles/permisos, usuarios,
ámbitos y designaciones): escribir una RPC por entidad para tablas con muchos campos sería mucho
código repetido y difícil de mantener.

## Decisión

- Las tablas de **configuración** admiten escritura directa por RLS, con **políticas explícitas**
  gobernadas por el permiso correspondiente mediante `public.has_permission((select auth.uid()), …)`:
  - `catalog.manage`: catálogos maestros, motivos, solicitantes, técnicos e `instance_settings`.
  - `role.manage`: `roles`, `role_permissions`, `user_roles`.
  - `assignment.manage`: `supervisor_scopes`, `supervisor_scope_buildings`, `technician_categories`.
  - `user.manage`: `profiles` (activar/desactivar y editar).
- Los **catálogos se desactivan** (`active = false`), nunca se borran (RN-22); solo las tablas de
  **relación** (`user_roles`, `role_permissions`, `supervisor_scopes`, `supervisor_scope_buildings`,
  `technician_categories`) admiten `DELETE`.
- Las **transiciones del tiquet siguen siendo solo por RPC** (`security definer`), como en el
  ADR 0015. La RLS de lectura no cambia.

## Alternativas consideradas

- **Una RPC por entidad**: correcto pero con decenas de funciones casi iguales para catálogos con
  muchos campos; más superficie y más pruebas.
- **Una RPC genérica `admin_upsert(entity, data)`**: menos código, pero con validación y lista
  blanca frágiles y errores menos claros.

## Consecuencias

- El ADR 0015 queda acotado a las transiciones del flujo; la administración se gobierna por RLS.
- Las políticas se prueban con pgTAP (un admin escribe; un no-admin no).
- El cliente de administración (feature `admin`) escribe tablas de configuración directamente; el
  núcleo no cambia su regla de que el estatus del tiquet solo cambia por RPC.