# 0044 — Evidencia por estado y acciones guiadas

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

La evidencia podía subirse en cualquier momento: `evidence_add` no validaba el tipo contra el
estado del tiquet y la interfaz mostraba un subidor libre. Además, aunque iniciar y atender ya
exigían `before`/`after` en sus RPC, la interfaz no lo guiaba (un "Iniciar" de un clic fallaba si
faltaba la foto) y abrir una reclamación no exigía la evidencia `claim`. La especificación pide
`before`/`after` por ciclo y `claim` en la reclamación, y la foto de solicitud como opcional.

## Decisión

- **Backend:** `evidence_add` valida el **tipo** contra el **estado** del tiquet, y
  `ticket_open_claim` exige evidencia `claim` del ciclo. Migración
  `20261009090000_evidence_state_rules.sql`.
- **Matriz tipo ↔ estado** (lógica fija):

  | Tipo | Estados permitidos |
  |---|---|
  | `request` | `registered` |
  | `before` | `assigned` |
  | `during` | `in_progress`, `paused` |
  | `after` | `in_progress`, `paused` |
  | `claim` | `attended`, `closed`, `under_claim` |
  | `other` | cualquier estado no final |

- **Interfaz guiada:** las acciones que exigen evidencia la piden en su propio diálogo y la suben
  antes de ejecutarse (iniciar → "antes"; atender → descripción + "después"; reclamar →
  motivo + descripción + evidencia). Iniciar deja de ser de un clic.
- **Subidor libre acotado:** en el detalle solo se ofrecen los tipos válidos del estado actual
  (`features/tickets/domain/evidence.ts`).
- **Foto de solicitud:** el alta permite adjuntar una imagen (`request`) y la sube al crear.
- **Orden offline:** la evidencia y la acción comparten la cola ordenada por `seq`, así que al
  sincronizar la evidencia se registra antes que la acción que la exige.

## Alternativas consideradas

- **Solo guiar en la interfaz** sin validar en el backend: la regla quedaría a medias.
- **`forbidden_evidence` por transición**: más complejo; la matriz por estado es suficiente.

## Consecuencias

- El flujo guía al usuario y el backend impide combinaciones incoherentes.
- Los e2e y pgTAP se actualizaron al nuevo flujo (iniciar/atender por diálogo; `claim` antes de
  reclamar).
- Un tipo de evidencia nuevo exige actualizar la matriz en la migración, el dominio del frontend y
  sus pruebas.
