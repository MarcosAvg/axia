# 0049 — Indicadores de métricas filtrables y nuevos temas

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Tras el rediseño por pestañas (ADR 0048) quedaron tres problemas:

1. La barra de filtros (fechas y catálogos) **solo se aplicaba a los KPI derivados de la lista de
   tiquets**. Los bloques que salían de vistas globales (SLA, satisfacción, pausas, duplicados)
   **ignoraban el rango**: con "7 días" seguían mostrando el histórico completo.
2. Varios indicadores ya tenían vista en la base pero **no se mostraban**: carga por técnico
   (`v_metrics_by_technician`), rechazos/cancelaciones por motivo, ruteo y toma, y la dimensión
   solicitante.
3. La barra era **sticky**, lo que en pantallas bajas robaba espacio y no aportaba tanto como
   parecía.

## Decisión

- **Filtros en el servidor** (migración `20261009110000_metrics_rpc.sql`): funciones `metrics_*`
  `security invoker` que recalculan cada indicador agregado con parámetros opcionales
  `p_from`, `p_to`, `p_building`, `p_team`, `p_category`, `p_dependency`. Filtran por el **día UTC**
  de `reported_at` (misma convención que el filtro del cliente, `metrics_date_in`) y por dimensión
  (`metrics_dims_in`). La RLS se mantiene. Los hooks pasan los filtros en su clave de consulta.
- **Deltas vs periodo anterior** en los KPI derivados de tiquets (cliente, sin migración), con
  dirección "bueno/malo" por indicador.
- **Dimensión solicitante** y **marca de reasignación de técnico**.
- **Nuevos indicadores**: pestaña **Equipo** (carga por técnico), sección de **rechazos y
  cancelaciones por motivo** (Calidad) y tarjetas de **ruteo y toma** (Resumen).
- **Barra de herramientas no fija** (se revierte el "sticky" del ADR 0048).
- **Regresión visual con Playwright opt-in** (`pnpm test:visual`), fuera de `pnpm check`, con
  capturas versionadas y máscaras sobre gráficas y datos relativos a la fecha.

## Alternativas consideradas

- **Parametrizar las vistas**: Postgres no permite parámetros en vistas; habría que recrearlas como
  funciones igualmente.
- **Filtrar en el cliente las vistas globales**: imposible con agregados (SLA/satisfacción no
  exponen filas por tiquet); habría que duplicar la lógica de negocio en el frontend.
- **Regresión visual en la compuerta**: frágil por fuentes, datos relativos a la fecha y entorno;
  se deja como script opt-in y actualizable.

## Consecuencias

- Todos los bloques del tablero respetan la barra de filtros y pueden compararse contra el periodo
  anterior (salvo SLA y satisfacción, sin delta por decisión).
- Aparecen tres indicadores que ya existían en la base pero no en la interfaz.
- `database.types.ts` se regenera con `pnpm db:types`; la verificación incluye pgTAP
  (`84_metrics_views.test.sql`).
- La regresión visual no bloquea la compuerta; se ejecuta a mano y sus capturas viven en
  `apps/web/visual/__screenshots__`.
