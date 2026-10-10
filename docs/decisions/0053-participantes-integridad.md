# 0053 — Integridad de participantes (una activa por técnico y tiquet)

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

`ticket_participants` podía acumular **participaciones duplicadas** del mismo técnico en un tiquet:

- `ticket_assign_technician` insertaba una participación **sin comprobar duplicados**, así que asignar
  al mismo técnico (o a alguien que ya era auxiliar) creaba otra fila.
- `ticket_add_auxiliary` sí validaba, pero solo contra participaciones activas **del mismo ciclo**.
- Las participaciones **nunca se cerraban** (`ended_at` se quedaba en `null`), así que además el
  tiempo de apoyo en métricas crecía sin fin.
- La semilla **no tenía designaciones** (`technician_categories = 0`): todo técnico asignado se
  registraba como **auxiliar**, nunca como líder.

Se detectó un caso real en la base ("Chale 2" con Luis Gómez dos veces como auxiliar).

## Decisión

- **Índice único parcial** `ticket_participants_active_unique (ticket_id, technician_id) where
  ended_at is null`: un técnico no puede tener dos participaciones activas a la vez. La migración
  **sanea** antes los duplicados existentes (conserva la más antigua).
- **Asignar técnico** reutiliza la participación activa del técnico y lo **promueve a líder** si está
  designado para la categoría; además **cierra la participación del líder anterior**.
- **Agregar auxiliar** valida contra **cualquier** participación activa (sin filtro de ciclo).
- **Trigger** `tickets_close_participants`: al cerrar/terminar el tiquet
  (`closed/rejected/cancelled/duplicate`) o al cambiar de ciclo, se cierran las participaciones.
- **UI**: el desplegable de "Agregar auxiliar" excluye a quien ya participa activo en el tiquet.
- **Semilla**: más técnicos (7), categorías (9), subcategorías (14) y problemas (23), con
  **designaciones** para que existan líderes reales.

## Alternativas consideradas

- **Permitir duplicados y deduplicar al mostrar**: no arregla las métricas ni la integridad.
- **Rechazar** al técnico que ya participa: se prefirió **reutilizar/promover** (menos fricción).
- **Cerrar participaciones solo al cerrar el tiquet**: insuficiente al reasignar el líder.

## Consecuencias

- Un técnico no puede quedar duplicado como líder/auxiliar; el historial y las métricas son
  coherentes y las participaciones se cierran cuando corresponde.
- La semilla estrena líderes reales (designaciones) y catálogos más ricos.
- Pruebas pgTAP nuevas en `95_flow_completion.test.sql` (reasignar no duplica, designado se promueve,
  cerrar cierra participaciones, el índice rechaza duplicados).
