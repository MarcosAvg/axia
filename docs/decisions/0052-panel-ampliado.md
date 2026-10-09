# 0052 — Panel de inicio ampliado por rol

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

El Panel (`/`, ADR 0041) era plano: saludo, accesos rápidos, cuatro KPI según rol y las bandejas.
No mostraba tendencias, ni tiempos, ni señales de alerta, ni actividad reciente.

## Decisión

Ampliar el Panel, siempre **personal y limitado por RLS**, con **seis bloques**:

- **KPI según rol** (hasta 6):
  - Técnico: mi trabajo · en curso · en pausa · por validar · **trabajo activo** · **primera
    resolución**.
  - Supervisor: ofertas · sin asignar · en pausa · por validar · **SLA**.
  - Admin: activos · sin asignar · en pausa · cerrados · **SLA** · **satisfacción**.
- **Gráficas**: *tiquets por mes* (línea, `volumeByMonth`) y *por estado* (barras, `countByStatus`).
- **Requiere tu atención**: los tiquets abiertos más antiguos (`openAging`), con enlace al detalle.
- **Actividad reciente**: últimos `ticket_events` visibles (folio, tipo, fecha).
- Se conservan **bandejas** y **acciones rápidas**.

Para no duplicar, el dashboard **reutiliza** el feature de métricas: se exponen desde su `index.ts`
los hooks y funciones puras necesarias (`useMetricsTickets`, `useSla`, `useSatisfaction`,
`summarize`, `openAging`, `volumeByMonth`, `formatMonthLabel`, …). Las gráficas del Panel son
propias (reutilizan `components/ui/chart`).

## Alternativas consideradas

- **Mantener solo conteos**: sin tendencias ni tiempos.
- **Un endpoint nuevo de métricas personales**: innecesario; las vistas de métricas ya aplican RLS.
- **Duplicar gráficas**: se prefirió reutilizar dominio/hooks de métricas.

## Consecuencias

- El Panel pasa de un resumen plano a un tablero personal con KPIs, gráficas, pendientes y actividad;
  los KPI se adaptan al rol y la RLS acota los datos.
- El `index.ts` de métricas expone más superficie pública (documentada); sin cambios de base de datos.
- La captura visual del Panel enmascara las gráficas y la antigüedad para mantenerse estable.
