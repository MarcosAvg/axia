# 0011 — Motivos jerárquicos (sustituye 0005)

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

La primera versión (ADR 0005) modelaba los bloqueos como una entidad con tipos, estados,
transiciones y campos dinámicos, y permitía varios bloqueos activos. La especificación de negocio
pide motivos **jerárquicos de profundidad ilimitada** por tipo de uso y **una sola pausa abierta**
por tiquet.

## Decisión

Un único catálogo `reasons` con `use` (`pause`, `rejection`, `cancellation`, reasignaciones,
`recapture`, `claim`, `claim_outcome`, `reactivation`, `auxiliary_support`), `parent_id`
(profundidad ilimitada) y, por nodo, `requires_note`, `allows_estimated_date` y `clock_class`. Una
pausa abierta por tiquet (`ticket_pauses` con índice único parcial) y sus pasos en
`ticket_pause_steps`.

## Alternativas consideradas

- **Mantener el modelo del 0005:** no cubría la jerarquía ni la clasificación de reloj, y permitía
  varios bloqueos a la vez, contrario a la especificación.

## Consecuencias

- Sustituye al ADR 0005 (marcado como sustituido).
- El estado macro `paused` con una sola pausa; al resolverse, vuelve a `in_progress`.
- Los subestados se miden por tramo.
