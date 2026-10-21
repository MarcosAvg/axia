# 0034 — Convivencia con el sistema de origen (Fase 6D)

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

Mientras el sistema de origen y Axia convivan, hacen falta piezas genéricas para: reflejar en el
origen un cambio de Axia, ver qué estado reporta el origen y saber quién manda cuando hay
diferencias. Todo sin acoplar el núcleo a ninguna plataforma.

## Decisión

- **Tareas de convivencia** (`integration_tasks`): una tarea por cambio que deba reflejarse en el
  sistema externo, con **descripción**, **responsable**, **fecha** y **estado**
  (`open`/`done`/`cancelled`). RPCs `integration_task_create` y `integration_task_resolve`.
- **Estado reportado por el origen** (`ticket_external_refs.external_status`) y RPC
  `external_status_set`, para detectar diferencias sin acoplar el modelo.
- **Autoridad del dato** (`external_systems.authority`: `source`/`axia`/`manual`), para decidir quién
  manda en un conflicto.
- **UI** en `/admin/integraciones`: lista de tareas abiertas con acción para marcarlas como hechas.
- Todas las escrituras pasan por RPC con el permiso `data.import`; lectura por RLS con ese permiso.

## Alternativas consideradas

- **Comentarios libres** para anotar “pendiente actualizar el origen”: se prefirió una tarea con
  responsable y fecha (es una convención genérica del núcleo).
- **Sincronización saliente automática**: fuera de alcance; la tarea es manual.

## Consecuencias

- La convivencia queda cubierta por **convenciones genéricas**; el texto “qué actualizar y dónde” lo
  aporta el adaptador.
- La **autoridad** es orientativa (no bloquea cambios); sirve para resolver desacuerdos con criterio.
- Pendiente opcional: acciones de importación (edge/CI) y la PWA (7C/7D).