# 0062 — Subestados de pausa en cascada

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

El ADR 0061 dejó la pausa con motivo raíz y exigió un subestado al reanudar, pero **mostraba de golpe
todos los hijos directos del motivo** en un solo select y la RPC exigía un **hijo directo**. Los
subestados pueden anidarse (el catálogo `reasons` no tiene límite de profundidad), así que hacía falta
**bajar por la rama**: elegir un subestado del ya seleccionado.

## Decisión

- **Selección en cascada**: un select por nivel; el primero ofrece los **hijos del motivo** y, al
  elegir uno, aparece el siguiente con **sus hijos**; el **último elegido** es el subestado. Aplica a
  **Gestionar la pausa** y a **Reanudar**. El alta de pausa sigue eligiendo solo el **motivo**.
- **Profundidad libre**: al reanudar (y al gestionar) el subestado puede ser de **cualquier
  profundidad**. `ticket_resume` pasa de exigir “hijo directo” a **descendiente del motivo**
  (`reason_is_descendant_or_self`, excluyendo el motivo). `ticket_advance_pause` ya admitía
  descendientes.
- **Semilla**: se agrega un tercer nivel (subestados de un subestado) para la demo y las pruebas.

## Alternativas consideradas

- **Un solo select con el árbol indentado**: menos guiado que la cascada.
- **Una acción por nivel**: obliga a varias acciones para bajar dos niveles.
- **Mantener “hijo directo”**: impide llegar a subestados anidados.

## Consecuencias

- La pausa se clasifica bajando por la rama; el subestado final queda en `ticket_pauses.reason_id` y
  como paso, con su tramo de tiempo.
- Nueva migración que recrea `ticket_resume` (descendiente); sin cambios de columnas.
- Componente `ReasonCascade` y helper `pathToReason`; pgTAP verifica descendiente de segundo nivel y
  rechazo fuera del motivo; e2e pausa → gestionar (2 niveles) → reanudar (2 niveles).
