# 0046 — Rediseño de administración

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

La administración mezclaba patrones: cada pantalla repetía un encabezado propio (doble con el del
layout), las listas alternaban tarjetas y tablas, los estados de carga/vacío eran inconsistentes
y había colores fijos. Roles mostraba el alta siempre visible y los catálogos, listas de tarjetas.

## Decisión

- **Encabezado único por pantalla**: el layout de `admin` deja de pintar el encabezado; cada
  pantalla usa `PageHeader` con su título y descripción (`adminMessages.descriptions`).
- **Catálogos**: `DataTable` (nombre, detalles, estado con tokens y acciones Editar/Activar),
  `EmptyState` y carga con `LoadingList`.
- **Roles**: **master-detail** (lista de roles a la izquierda; detalle a la derecha) con el alta en
  **modal**; la **matriz de permisos** se agrupa por área (Tiquets, Tiempos, Evidencia, Métricas,
  Datos, Catálogos, Usuarios, Roles, Designaciones, Otros) con su ámbito.
- **Usuarios**: `DataTable` (nombre, activo, roles como chips y acción) con un **modal** para
  asignar roles; los vínculos con los catálogos quedan en su sección.
- **Ámbitos**: **pestañas** Supervisores / Técnicos.
- **Configuración**: por **secciones** (General · Validación y evidencia · Tiempos y SLA) con
  `FormSection`, **barra de guardado** fija y aviso por `toast`.
- **Calendarios e integraciones**: mismo encabezado; se quitaron los títulos duplicados.
- La lógica de la pantalla de roles se extrae a `useRolesController` para no inflar el componente.

## Alternativas consideradas

- **Mantener tarjetas**: no aprovechan el ancho ni permiten escanear en escritorio.
- **Usuarios master-detail**: más pesado; tabla + modal es suficiente.

## Consecuencias

- Encabezados y estados homogéneos en toda la administración.
- Listas densas y legibles en escritorio; acciones en modales.
- Los e2e de administración se ajustaron (alta de rol por modal; lista de roles en lugar de
  pestañas).
