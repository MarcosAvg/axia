# 0074 — Contrato de sincronización offline

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

El técnico puede ejecutar acciones sin red. El cliente conserva una cola en Dexie y debe reenviarla
sin duplicar efectos, respetando el orden por tiquet y mostrando los conflictos.

## Decisión

1. **Endpoint `POST /api/sync/actions`** con un lote máximo de 100 ítems. Cada ítem lleva
   `clientRequestId`, `ticketId`, `type`, `args` y `occurredAt`.
2. **Misma lógica que la API online.** El servidor reutiliza `runTicketAction`; no hay un camino de
   escritura alternativo ni se confía en el estado enviado por el cliente.
3. **`occurredAt`** se valida contra la creación del tiquet, un margen de 5 minutos al futuro y 30
   días de antigüedad. El evento guarda `occurred_at` del cliente y `recorded_at` del servidor.
4. **Idempotencia** por `clientRequestId` mediante `ticket_events.client_request_id`. Un reenvío se
   informa como `duplicate`, no se aplica dos veces.
5. **Resultado por ítem**: `applied`, `duplicate`, `rejected`, `conflict` o `blocked`. El cliente
   muestra el resultado; nunca se descarta una acción en silencio.
6. **Orden y bloqueo.** Se procesa en orden. Un `rejected` o `conflict` bloquea los ítems
   posteriores del mismo tiquet con `blockedBy`; los de otros tiquets continúan.
7. **Sin relojes de confianza.** El servidor registra siempre su hora en `recorded_at`; la hora del
   cliente solo se usa para el momento funcional de la acción.

## Consecuencias

- El servidor es la autoridad de permisos, estado y concurrencia.
- La cola del cliente debe conservar el orden y el `clientRequestId` al reintentar.
- La lógica de `occurredAt` requiere que el reloj del dispositivo esté razonablemente sincronizado;
  los límites son configurables.

## Alternativas descartadas

- **Aplicar acciones offline con `UPDATE` directo:** saltaría permisos y reglas de estado.
- **Descartar silenciosamente los conflictos:** ocultaría trabajo perdido.
- **Confiar en el estado que envía el cliente:** permitiría saltarse transiciones.
