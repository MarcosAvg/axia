# 0127 — Desglose de métricas con la lista de tiquets

## Contexto

El tablero de Métricas muestra conteos, tasas y percentiles, pero no permite ver qué tiquets
componen cada número. Para investigar un indicador hacía falta reconstruir los filtros a mano en la
lista general, y algunos agregados (pausas por motivo, SLA, desglose por problema) no tienen un
filtro equivalente en esa lista.

## Decisión

1. Cada número del tablero que representa un conjunto de tiquets abre un panel lateral con la lista
   paginada. La lista reutiliza `GET /api/tickets` y el alcance de `ticket.view`.
2. Los filtros de desglose se añaden a la lista de tiquets: desenlace, subcategoría, problema,
   ubicación, canal, SLA, calificación, pausas, motivo terminal, banderas de calidad, oferta
   pendiente, participación y fase.
3. El desglose usa los datos actuales de los tiquets y las vistas de métricas
   (`v_ticket_metrics_base`, `v_ticket_sla`, `ticket_pauses`); no reconstruye la historia evento por
   evento para demostrar la causalidad de un percentil.
4. La interfaz declara la aproximación cuando existe: una pausa es un evento y la lista muestra
   tiquets con esa pausa; el perfil de fases lista el universo de la fase y no un tramo exacto entre
   cuantiles.

## Consecuencias

- No se duplica la lógica de agregación de métricas en un endpoint nuevo.
- La lista y el número pueden diferir en pausas, percentiles y con el reloj Extra; la interfaz lo
  explica y, en Extra, el perfil de fases no ofrece desglose.
- El desglose exige `ticket.view`; sin ese permiso la cifra se muestra como texto. El resumen
  conserva su guarda preexistente de `ticket.view`.
- Los filtros nuevos se validan en el servidor y conservan el alcance autorizado.
- Revertir la decisión es retirar los filtros de desglose y el panel; no cambia datos persistidos.
