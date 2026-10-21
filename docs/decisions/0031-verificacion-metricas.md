# 0031 — Verificación de las métricas del núcleo (Fase 6C-1)

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

El criterio de aceptación de la migración (§9 de `docs/history/integraciones-y-migracion.md`) exige que los
**conteos y los tres intervalos** de Axia coincidan con las cifras de la fuente, verificados con
**datos ficticios equivalentes**. Los tiquets importados **no reconstruyen la línea de tiempo**
(`import_ticket_upsert` escribe el tiquet y un evento `imported`, pero no crea tramos), así que sus
intervalos intermedios no se calculan todavía.

## Decisión

- **Verificar los cálculos con un conjunto ficticio equivalente** (prueba `92_metrics_verification.test.sql`):
  marcas de tiempo fijas por flujo (reporte → tomado → asignado → iniciado → pausado → reanudado →
  atendido → cerrado) y **valores esperados calculados a mano** para respuesta, asignación, espera
  de inicio, trabajo activo, pausa, validación, **total** y **neto**.
- Cubrir la **pausa no contable** (el neto = total − pausa), la **exclusión de duplicados** y los
  **conteos** de la vista base.
- **Puente con la importación**: un tiquet insertado con `import_ticket_upsert` conserva su **tiempo
  total** (`closed_at − reported_at`).
- **6C-2 (reconstruir la línea de tiempo al importar)** queda **fuera** de este tramo: para que los
  tres intervalos de un importado coincidan con la hoja hay que registrar sus marcas (asignación y
  finalización) como historia; se hará solo si se pide.

## Alternativas consideradas

- **Importar los intervalos como cifras**: prohibido por la especificación (§7: el tiempo se
  calcula, no se almacena).
- **Reconstruir la historia ya en 6A/6B**: cambia el modelo de importación y la semántica de los
  tiquets importados (§6); se difiere.

## Consecuencias

- Las **fórmulas** de métricas quedan verificadas contra valores calculados a mano; sirven para la
  migración de conteos y del tiempo total.
- Los **tres intervalos de los importados** requieren 6C-2 (reconstruir su historia) para coincidir
  plenamente con la fuente.
