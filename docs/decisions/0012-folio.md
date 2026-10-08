# 0012 — Folio: UUID interno, consecutivo global y patrón legible

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

El folio es visible y debe ser legible; además hace falta un identificador interno y un conteo
confiable. La especificación prohíbe calcular el consecutivo con `max(numero)`.

## Decisión

Cada tiquet tiene `id uuid` (interno), `ticket_number bigint` desde una **secuencia** de Postgres
(consecutivo global) y `folio text` formado con un **patrón configurable**
(`instance_settings.folio_pattern`, semilla `AX-{yyyy}-{num}`). El folio y el número son
**inmutables** (disparador). El folio se calcula en un disparador al insertar.

## Alternativas consideradas

- **Solo consecutivo:** poco expresivo en papel.
- **Folio como clave primaria:** frágil y difícil de cambiar.

## Consecuencias

- Los importadores pueden conservar numeraciones previas y continuar después del mayor.
- Cambiar el patrón no altera folios ya emitidos.
