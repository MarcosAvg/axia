# 0027 — Tiempos objetivo (SLA) configurables

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 5 quedó cerrada salvo el cumplimiento de tiempos objetivo (§11). La prioridad ya tenía
`target_minutes` opcional desde la Fase 1, con su campo en administración, y el escalamiento ya
usaba las condiciones `target_near`/`target_overdue`. Faltaba el objetivo por tipo de servicio, la
medición y las vistas de cumplimiento.

## Decisión

- **Objetivos configurables como datos.** Se agrega `service_types.target_minutes` (opcional) y se
  mantiene `priorities.target_minutes`. `NULL` = sin objetivo (no cuenta). Se editan en
  `/admin/catalogos`, capturando la cantidad en **minutos, horas o días** (se guarda en minutos).
- **Regla de aplicación**: el objetivo del **tipo de servicio** sobrescribe al de la **prioridad**;
  si falta el del tipo, se usa el de la prioridad; si ninguno existe, el tiquet no tiene SLA.
- **Medición**: **resolución** (registro → cierre) sobre tiquets **cerrados** y sin duplicados.
- **Modo de reloj configurable**: `instance_settings.sla_clock_mode` (`calendar` | `laboral`);
  por defecto `calendar`. Se edita en `/admin/configuracion`.
- **Vistas**: `v_ticket_sla` (por tiquet: objetivo, tiempo medido y si cumple), `v_metrics_sla`
  (cumplimiento global) y `v_metrics_sla_by_priority` (por prioridad).
- **Tablero**: KPI de cumplimiento y sección por prioridad.

## Alternativas consideradas

- **Matriz prioridad × tipo de servicio**: más completa y más configuración; se prefirió la regla
  “tipo sobre prioridad” por simplicidad (se puede migrar a matriz si se pide).
- **Objetivo fijo en código**: se descartó; los valores son datos y cambian por institución.
- **Medir primera respuesta o trabajo activo**: se prefirió la resolución, que es el indicador más
  habitual; el modo de reloj permite ajustar la lectura.

## Consecuencias

- El SLA queda **configurable** y puede quedar sin valores (`NULL`) sin romper nada.
- Los objetivos alimentan el escalamiento; el envío real de alertas es de la Fase 7.
- **Fase 5 cerrada**: solo quedan menores de UI (`Progress`, más `Tooltip`/`Skeleton`) y XLSX.
