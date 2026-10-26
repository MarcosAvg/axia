# 0088 — Indicadores agregados en SQL, actor en una consulta y abanico SSE acotado

- Fecha: 2026-10-26
- Estado: aceptada

## Contexto

El panel y el tablero de indicadores descargaban **todos** los tiquets visibles para resumirlos en
el navegador. Cada tiquet pasaba por la vista `v_ticket_metrics_base`, que calcula tiempos con
funciones SQL; la respuesta crecía con el histórico y el cliente repetía el trabajo en cada filtro.
Además, cada petición autenticada ejecutaba siete consultas para cargar al actor y una actualización
de sesión aunque no tocara, y cada evento SSE hacía una consulta de visibilidad por suscriptor.

## Decisión

- `GET /api/metrics/summary` calcula el resumen, los grupos por dimensión, el volumen mensual y la
  antigüedad en **una sola** consulta con `GROUPING SETS` sobre una CTE materializada: la vista se
  lee una vez. El panel pide `compact=1`, que solo devuelve resumen y volumen y omite los grupos y
  la antigüedad. Se retira `GET /api/metrics/tickets` y la agregación en el cliente.
- `loadActor` carga usuario, roles, permisos, solicitante, técnico, ámbitos y zona horaria en una
  sola consulta con subconsultas JSON. `loadSession` solo actualiza `last_used_at` cuando la sesión
  supera el intervalo de toque.
- El abanico SSE agrupa suscriptores por actor: una consulta de visibilidad por actor y evento, en
  paralelo, y el mismo texto se escribe a todas las pestañas. Un actor con alcance global y sin
  vínculo de solicitante no consulta. El puente serializa los eventos para conservar el orden.

## Consecuencias

- El coste de los indicadores queda acotado por la base de datos y no por el tamaño de la respuesta;
  el navegador ya no conserva el histórico completo para calcular tasas.
- Los grupos por dimensión siguen siendo la fuente del tablero y de la exportación; ahora vienen
  calculados por el servidor con la misma vista y los mismos filtros.
- La carga del actor y la sesión cuestan menos viajes por petición sin cachear permisos: un cambio
  de rol se aplica en la siguiente petición, como antes.
- Varias pestañas del mismo usuario comparten una comprobación SSE. Si la base falla durante la
  comprobación, el evento se omite en vez de cerrar las suscripciones.
- `apps/server/test/db/metrics-http.test.ts` cubre el resumen, los grupos, el filtro por equipo, el
  alcance del técnico y el modo compacto.
