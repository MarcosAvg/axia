# 0056 — Clasificación del alta: servicio en la atención, prioridad del problema y canal de plataforma

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

El alta pedía cuatro clasificaciones que no siempre se conocen al registrar y que el solicitante no
puede decidir de forma confiable:

- **Tipo de servicio** (`service_type_id`): es un dato de **ejecución**, no de la solicitud; pedirlo
  al registrar obligaba a adivinar y quedaba mal clasificado. Además era `NOT NULL`.
- **Prioridad** (`priority_id`): la define el negocio según el **problema**; dejarla al solicitante
  (o a cualquiera) producía prioridades arbitrarias. Solo supervisor/admin pueden ajustarla después.
- **Canal** (`channel_id`): si el **propio solicitante** registra desde la app, el canal siempre es
  **plataforma**; solo tiene sentido elegirlo cuando se registra **a nombre de otro**.
- **Solicitante**: el nombre y el contacto ya viven en el **catálogo**; volver a capturarlos a mano
  duplicaba el dato y permitía inconsistencias.

## Decisión

- **`tickets.service_type_id` pasa a `NULL`**: el tipo de servicio se captura en la **atención**
  ("Marcar atendido"). `ticket_attend` recibe `p_service_type_id` (nuevo parámetro al final, con
  valor por defecto para no romper llamadas posicionales) y **falla** con `P0001` "Falta el tipo de
  servicio" si el tiquet se quedaría sin él. La interfaz exige el select antes de confirmar.
- **La prioridad se deriva**: `problems.default_priority_id` define la del problema y
  `instance_settings.default_priority_id` es el respaldo configurable. `ticket_create` hace
  `coalesce(problema, instancia, primera prioridad activa)`. El solicitante **no** la puede cambiar;
  supervisor/admin la ajustan con `ticket_change_priority` (ya existente).
- **Canal de plataforma**: `channels.is_platform` marca el canal de la app. `ticket_create` usa ese
  canal cuando registra el **propio solicitante** y respeta `channel_id` solo cuando la petición es
  **a nombre de otro** (con `ticket.create_on_behalf`).
- **Solicitante del catálogo**: `ticket_create` toma `full_name` y `contact` de
  `requesters` (ya no acepta `requester_name`/`requester_contact`). La UI muestra el select del
  catálogo (con la opción de elegirse a sí mismo, preseleccionada) y ya no captura texto libre.
- **Administración**: se puede editar la **prioridad por defecto del problema**, marcar el
  **canal de plataforma** y fijar la **prioridad por defecto de la instancia**.

## Alternativas consideradas

- **Pedir el tipo de servicio en el alta**: es el problema original; se desconoce al registrar.
- **Exigir la prioridad al solicitante**: contradice la regla de negocio (solo supervisor/admin).
- **Un RPC aparte para el tipo de servicio**: dos llamadas y una ventana de inconsistencia; mejor
  ampliar `ticket_attend`.
- **Dejar los campos de solicitante editables**: duplica el catálogo y permite divergencias.

## Consecuencias

- Las altas no clasifican servicio ni prioridad; el tiquet nace con `service_type_id = NULL` y la
  prioridad del problema (o la de la instancia).
- `ticket_attend(uuid, text, uuid, uuid, uuid)` sustituye a la firma anterior; la nueva cae al
  final con default, así que las llamadas de 2–4 argumentos siguen compilando.
- El detalle admite `service_type_id` nulo (`TicketDetail.serviceTypeId: string | null`); la
  recaptura envía `null` si se deja vacío.
- pgTAP (`40_routing_transitions`) verifica servicio nulo, prioridad derivada, canal de plataforma
  del propio solicitante, canal elegido a nombre de otro, solicitante del catálogo y la atención que
  exige servicio. El e2e (`ticket-flow`) captura el servicio al atender.
