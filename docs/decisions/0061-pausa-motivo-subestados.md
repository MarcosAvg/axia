# 0061 — Pausa por motivo y subestados, con subestado obligatorio al reanudar

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

El ADR 0060 expuso los subestados de la pausa (gestionar/avanzar) pero dejaba el flujo incompleto
frente a la regla de negocio: **el motivo es el nodo padre y al reanudar hay que esclarecer el estado
de la pausa con un subestado** (hijo del motivo); además debe poder **gestionarse la pausa** cambiando
de subestado mientras está abierta. En 0060 el reanudar cerraba sin subestado, el catálogo no se
separaba en motivo/subestado y los tramos de tiempo seguían etiquetados con el motivo.

## Decisión

- **Motivo = nodo raíz**: `ticket_pause` exige un motivo raíz del uso `pause`, activo; se guarda en
  `ticket_pauses.root_reason_id` (nuevo).
- **Gestionar la pausa** (`ticket_advance_pause`): el subestado debe ser **cualquier descendiente del
  motivo** (libre dentro del motivo), activo.
- **Reanudar exige subestado**: `ticket_resume(p_ticket_id, p_reason_id, …)` requiere un **hijo
  directo del motivo**, activo; lo registra como paso, fija `ticket_pauses.reason_id = subestado` y
  escribe `resumed` con ese subestado.
- **Tramos por subestado**: `pause_advanced` cierra el tramo `pause` abierto y abre uno nuevo con el
  subestado; `resumed` etiqueta el tramo abierto con el subestado de reanudación y lo cierra (con su
  `clock_class`).
- **`ticket_pause_state(p_ticket_id)`**: devuelve la pausa abierta con motivo y subestado actual, para
  los formularios.
- **UI**: al pausar solo se elige el **motivo**; **Reanudar** abre formulario con el subestado
  obligatorio; **Gestionar pausa** ofrece los descendientes del motivo; el panel muestra **motivo**,
  **subestado actual** e historial de pasos.

## Alternativas consideradas

- **Permitir cualquier nodo del uso** como motivo: no separa motivo/subestado.
- **Subestado opcional al reanudar**: contradice la regla “esclarecer el estado de la pausa”.
- **Etiquetar solo `ticket_pauses.reason_id`** sin tocar tramos: no mide el tiempo por subestado.

## Consecuencias

- Flujo completo: pausar (motivo) → gestionar (subestados) → reanudar (subestado obligatorio).
- Nueva columna `ticket_pauses.root_reason_id`, helper `reason_is_descendant_or_self`, función
  `ticket_pause_state`, nueva firma de `ticket_resume` y disparador de tramos ampliado.
- pgTAP cubre: motivo raíz, gestión dentro del motivo, subestado obligatorio y hijo directo al
  reanudar, y tramos por subestado; e2e pausa → gestionar → reanudar con subestado.
- Semilla y pruebas de métricas actualizadas con `root_reason_id`.
