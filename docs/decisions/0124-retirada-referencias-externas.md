# 0124 — Retirar las referencias externas y la integración deshabilitada

**Fecha:** 2026-11-09
**Estado:** aceptada.

## Contexto

Axia funciona sin plataformas externas. Quedaban restos de una etapa anterior: una página de
administración de integraciones deshabilitada, un documento histórico con nombres de proveedores,
un verificador de nombres y las tablas genéricas `external_systems` y `ticket_external_refs`.
No había adaptadores publicados ni escrituras del núcleo sobre esas tablas. Mantenerlos conservaba
terminología, permisos y esquema que ya no describen el producto.

## Decisión

1. Retirar la página de administración, sus textos, su tarjeta y su miga de pan.
2. Retirar el documento histórico y sus enlaces. La historia queda en Git.
3. Retirar `check:agnostic`, su lista de nombres y su script. Las fronteras de dependencias siguen
   en `check:boundaries`.
4. Retirar `external_systems` y `ticket_external_refs` con la migración
   `0031_remove_external_refs.sql`. La migración bloquea ambas tablas y aborta si tienen filas,
   para que el operador exporte antes de perder datos; `RESTRICT` revierte ante dependencias
   inesperadas.
5. El núcleo sigue siendo independiente: no depende de plataformas externas ni de una segunda
   fuente de verdad. Si una integración vuelve a ser necesaria, se diseña como adaptador aislado
   con una decisión nueva.

## Consecuencias

- El esquema pasa de 52 a 50 tablas.
- Se pierde la comprobación automática de nombres de proveedores; la separación de capas y la
  revisión de cambios quedan como controles.
- Una instancia con filas en esas tablas no puede actualizar sin exportarlas; el mensaje de la
  migración lo indica.
- La parte de [0101](0101-retirada-historica.md) que conservaba estas tablas y el documento de
  integraciones queda sustituida por esta decisión.

## Reversión

Restaurar las tablas con una migración nueva y volver a introducir el adaptador y el documento;
los datos exportados se reimportan. No se edita la migración 0031.
