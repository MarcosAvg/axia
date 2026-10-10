# 0060 — Subestados de pausa en la interfaz

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

El núcleo ya modelaba los subestados de la pausa (ADR 0011, RN-13): `reasons` jerárquico, `pauses`
con `ticket_pause_steps`, y las RPC `ticket_pause` / `ticket_advance_pause` / `ticket_resume` (con
evento `pause_advanced` y métricas por `reason_id`). Pero la **interfaz no exponía** el avance de
subestado: `advance_pause` no existía en `ActionKey`/`TICKET_OPERATIONS`, el selector de motivo era
plano y el detalle no mostraba los pasos. La función parecía inexistente.

## Decisión

- **RPC `ticket_advance_pause`**: exige que el nuevo motivo sea **hijo directo** del subestado actual
  y esté **activo** (antes no lo validaba). `ticket_pause` exige un motivo del uso `pause` y activo.
- **`ticket_pause_steps(p_ticket_id)`**: expone los pasos (nodo, entró/salió, nota, actor) para el
  detalle, respetando `ticket.view` y `can_see_ticket`.
- **Acción "Avanzar subestado"** en la operación: `advance_pause` en `ActionKey`, `PROXY_ACTIONS`
  (proxy del técnico) y `TICKET_OPERATIONS`; visible en estado `paused` con permiso `ticket.pause`.
  No es la acción primaria (sigue siéndolo `resume`).
- **Selector jerárquico** al pausar: las opciones se **indentan** por profundidad; al avanzar el
  subestado, solo se ofrecen los **hijos directos** del actual.
- **Panel de pausa** en el detalle: subestado actual e historial de pasos con fechas.
- **Administración → Motivos**: la tabla sangra el árbol por `parent_id`.

## Alternativas consideradas

- **Permitir cualquier nodo del `use`** al avanzar: menos estricto y alejado del modelo ("nodo hijo
  válido"); se eligió el hijo directo.
- **No validar en la RPC y restringir solo en la UI**: la base aceptaría subestados inválidos.

## Consecuencias

- Los subestados de pausa son utilizables y medibles desde la app.
- Cambia la firma de comportamiento de `ticket_pause`/`ticket_advance_pause` (validaciones) y se
  añade `ticket_pause_steps`; pgTAP cubre hijo directo, inactivo y uso inválido.
- Nuevas piezas: `features/catalogs/domain/reasons.ts` (indentación e hijos), `domain/pause.ts`
  (subestado actual), `components/pause-panel.tsx`, y `pause-i18n.ts`; e2e de pausa → avanzar →
  reanudar.
