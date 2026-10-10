# 0058 — Rediseño de Usuarios, Ámbitos y Calendarios

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Tras el rediseño general de Administración (ADR 0057) quedaron tres vistas poco claras:

- **Usuarios**: mezclaba *cuentas* (roles/estado) con *vínculos con los catálogos*, y los vínculos
  eran un muro: por cada solicitante y cada técnico, un `Select` con **todas** las cuentas, sin
  búsqueda ni columnas.
- **Ámbitos**: pestañas con un `ul` sin encabezados ni estado vacío y un formulario al lado; los
  edificios del supervisor eran casillas sueltas dentro de cada fila.
- **Calendarios**: "Nuevo calendario" **reemplazaba el detalle** por un formulario (se confundía con
  editar) y mezclaba un formulario con `Guardar` con listas de franjas/festivos que se guardaban al
  instante; franjas y festivos eran `ul` planos con una fila de campos.

## Decisión

- **Usuarios en pestañas**: **Cuentas** (tabla Nombre · Teléfono · Roles · Vínculo · Estado · acciones,
  con búsqueda y orden) y **Vínculos** (dos tablas, Solicitantes y Técnicos, con Persona · Cuenta
  vinculada y un **diálogo con búsqueda** para asignar la cuenta). Desaparece el muro de selects.
- **Ámbitos con tablas**:
  - Supervisores: tabla Supervisor · Equipo · Edificios · acciones; **alta en diálogo** (usuario +
    equipo) y **edición de edificios en un diálogo con casillas y búsqueda**.
  - Designaciones: tabla Técnico · Categorías, con cada categoría como **chip quitables**; alta en
    diálogo (técnico + categoría).
- **Calendarios con rail + secciones**: la lista de calendarios a la izquierda; el detalle muestra la
  cabecera (nombre, estado, zona) con **Editar** que abre un **diálogo** (crear y editar comparten
  formulario), y **Franjas semanales** y **Días no laborables** como **tablas** con alta/baja en
  diálogo y confirmación de borrado. El guardado es explícito en el formulario y **inmediato** en
  franjas/festivos (con aviso).
- Se reutilizan las primitivas de ADR 0057 (`AdminToolbar`, `DataTable`, `EntityDialog`,
  `EntityForm`, `FormGroup`) y se añaden utilidades puras probadas (`domain/scope-list.ts`,
  ampliaciones de `domain/user-list.ts`).

## Alternativas consideradas

- **Vínculos desde la fila de la cuenta**: dificulta ver el catálogo completo; se prefirió la tabla
  por catálogo con diálogo.
- **Un solo botón "Guardar" para todo el calendario**: obligaría a reescribir franjas y festivos en
  una transacción; se mantiene el comportamiento por piezas (cabecera con guardar; franjas/festivos
  inmediatos).
- **Master-detail en Ámbitos**: los volúmenes no lo justifican; la tabla es más directa.

## Consecuencias

- Las tres vistas son legibles y consistentes con el resto de Administración.
- Nuevas piezas: `user-links`, `link-dialog`, `supervisor-scope-dialog`, `scope-buildings-dialog`,
  `designation-dialog`; se retiran `links-manager`, `supervisor-scope-form/row` y
  `designation-form/row`.
- Nuevas pruebas puras (`scope-list`, vínculos de `user-list`) y ajustes de textos de interfaz.
- Sin cambios de esquema, RPC ni permisos.
