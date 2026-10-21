# 0033 — Reconstruir la línea de tiempo al importar (Fase 6C-2)

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La verificación 6C-1 validó las fórmulas, pero los tiquets importados **no reconstruían su historia**
(`import_ticket_upsert` no crea tramos), así que los **tres intervalos** de la fuente no se
calculaban. La hoja sí trae «ASIGNACIÓN DE TRABAJO» y «FINALIZACIÓN DE TRABAJO».

## Decisión

- **RPC `import_ticket_timeline`** (definer, `data.import`): inserta **eventos sintéticos**
  (`source = 'import'`) en las marcas de la fuente, para que el disparador arme los tramos:
  - `assigned_technician` y `started` en la asignación → `technician_assignment` =
    **reporte → asignación** (atención) y `active_work` desde la asignación;
  - `attended` en la finalización → `active_work` = **asignación → finalización** (trabajo);
  - `created` y, si aplica, `validated` con el cierre; fija `closed_at` para que el **total** =
    reporte → finalización.
- **Idempotente**: si ya hay historia importada, no repite; y **no rellena** lo que la fuente no
  traía (se respeta §6 del documento de integraciones).
- El **adaptador** llama a la RPC tras el upsert (y la asignación del técnico).

## Alternativas consideradas

- **Importar los intervalos como cifras**: prohibido (§7: el tiempo se calcula).
- **No reconstruir**: deja los intervalos de los importados sin calcular.

## Consecuencias

- Los **tres intervalos** de un importado coinciden con la fuente (verificado con pgTAP).
- El **total** de un importado usa el cierre = finalización; la validación queda en 0 (la fuente no
  distinguía el paso de validación).
- `started` se sitúa en la asignación porque la fuente no registra un inicio aparte.