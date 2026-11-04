# 0115 — Rondas de oferta y ruteo sin salida

**Fecha:** 2026-11-04
**Estado:** aceptada

## Contexto

La reasignación de supervisor podía dejar un tiquet en `registered` sin ofertas activas. Ocurría
al reasignar a un equipo sin supervisores candidatos y al volver al equipo anterior dentro del
mismo ciclo, porque `ticket_offers` era única por `(ticket_id, cycle, supervisor_user_id)` y la
reoferta usaba `on conflict do nothing`. El tiquet quedaba visible pero sin nadie que pudiera
tomarlo, reasignarlo ni sacarlo del estado, salvo una asignación directa de técnico por
administración. La especificación pide que, sin candidatos, el tiquet pase a la cola de
administración como «sin ruteo» y genere alerta (RN-03).

## Decisión

- Cada ruteo abre una **ronda de oferta** (`ticket_offers.offer_round`) y conserva las ofertas de
  rondas anteriores. La restricción única pasa a `(ticket_id, cycle, offer_round,
  supervisor_user_id)`. `take` consume solo la oferta del ciclo vigente.
- `routeTicket` devuelve cuántas ofertas creó. Si son cero, escribe el evento `unrouted`, que la
  regla de notificación entrega a administración. La lista y el detalle exponen `isUnrouted` a
  quien tiene `ticket.assign_supervisor`; el solicitante no ve el estado interno de ruteo.
- Solo se oferta a supervisores activos con ámbito y con `ticket.view` y `ticket.take_offer`.
- El administrador puede reasignar desde `registered` para devolver el tiquet a ruteo. La
  reasignación directa a un supervisor exige que el destino pueda ver y continuar el tiquet.
- Al desactivar o archivar una cuenta se cierran sus asignaciones y ofertas abiertas. Si el trabajo
  aún no empezó, el tiquet vuelve a ruteo; si ya hay técnico asignado, el administrador conserva la
  coordinación.

## Alternativas descartadas

- **Reutilizar la oferta existente con `on conflict do update`:** corrige el síntoma, pero borra el
  historial de tomas y ofertas del ciclo y falsea los indicadores de ruteo.
- **Rechazar la reasignación sin candidatos:** evita casos nuevos, pero deja fuera la cola de
  administración que exige RN-03 y no rescata tiquets ya atascados.
- **Agregar un estado `unrouted`:** los estados son lógica fija; la marca se deriva de
  `registered` sin ofertas vigentes.

## Consecuencias

- Migraciones 0026 (rondas y tipo de evento) y 0027 (regla de notificación).
- `ticket_offers` conserva más filas: una por supervisor y ronda. Los indicadores de ofertas y tomas
  las cuentan igual que antes.
- Un tiquet sin candidatos queda visible como «sin ruteo» y genera una notificación por evento.
- Pruebas de regresión en `tickets-routing-http` para equipo sin candidatos, reoferta al mismo
  supervisor, destino sin permisos, recaptura y desactivación.

## Reversión

Eliminar la columna `offer_round`, restaurar la restricción única anterior, retirar la regla
`unrouted` y el valor del enum, y revertir la lista de estados que admite la reasignación
administrativa. Las ofertas nuevas tendrían que consolidarse antes de restaurar la restricción.
