# 0091 — Experiencia móvil recortada por rol

- Fecha: 2026-10-28
- Estado: aceptada

## Contexto

El móvil acumulaba la misma densidad que el escritorio: panel con análisis, gráficas,
actividad y varias bandejas; filtros completos antes de la lista; barra superior con cinco
controles; y el detalle del tiquet anteponía la gráfica de tiempos a las acciones. Para el
técnico eso aleja su tarea principal, que es atender el tiquet. El administrador, en cambio,
necesita conservar toda la información aunque la pantalla quede densa.

## Decisión

- **El recorte móvil aplica a técnico y solicitante.** Son perfiles de flujo: sus destinos
  principales son sus tiquets y las acciones sobre ellos.
- **El panel de esos perfiles prioriza la operación**: “Mi trabajo” es la acción principal del
  técnico; sus tiquets aparecen antes que la actividad reciente; no se muestra la gráfica de
  volumen ni los KPI de análisis.
- **El detalle del tiquet antepone las acciones**: para perfiles sin `metrics.view`, la tarjeta
  “Tiempo por fase” se oculta en móvil y se conserva en escritorio.
- **Supervisor y administrador no pierden información.** Sus paneles, métricas y secciones de
  administración siguen completos en móvil.
- **La navegación se simplifica sin quitar destinos**: en móvil, la administración se agrupa en
  “Panel de administración”; el tema se mueve al pie del menú; los filtros avanzados de tiquets
  se abren bajo demanda. La búsqueda global sigue encontrando las páginas internas.

## Consecuencias

- Los perfiles de flujo dejan de descargar el resumen de métricas en el panel.
- El técnico ya no ve indicadores de tiempo que llegaban vacíos porque su rol no tiene
  `metrics.view`.
- No hay cambios de API ni migraciones: el recorte es de presentación.
- La compuerta visual cambia para el panel móvil y las métricas móviles; las pruebas E2E cubren
  técnico, solicitante y administrador.
