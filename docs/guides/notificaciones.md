# Notificaciones y push

**Estado:** la bandeja in-app y SSE están implementados. **Web Push y el planificador quedan para una
etapa posterior**; no hay correo ni servicio externo en el núcleo.

## Lo que existe

- Reglas en `notification_rules` (evento → destinatario → canal `in_app`).
- El disparador `ticket_events_broadcast` publica `pg_notify` con el evento.
- `GET /api/events` entrega SSE autenticado y filtrado por alcance; `GET /api/events/changes`
  recupera eventos perdidos.
- `GET /api/notifications`, contador de no leídas, marcar una y marcar todas.
- La web muestra una campana con el contador y la ruta `/avisos`, donde se pueden abrir los tiquets,
  marcar un aviso o marcar todos. Los cambios llegan por SSE sin recargar; al recuperar el foco o la
  conexión se consultan los eventos perdidos.
- Un solicitante sin cuenta no recibe bandeja ni push; el tiquet conserva su contacto.

## Lo que falta

| Pieza | Decisión |
|---|---|
| Web Push | Infraestructura VAPID, suscripciones y entrega; activación opcional |
| Planificador | Job con advisory lock para escalamiento (`untaken`, `unassigned`, `target_*`) |
| Correo | Fuera del núcleo; no hay proveedor configurado |

El contrato de eventos y la bandeja son la base; añadir push no debe cambiar el flujo de tiquets.
