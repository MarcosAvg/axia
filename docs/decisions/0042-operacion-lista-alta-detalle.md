# 0042 — Rediseño de la operación (lista, alta, detalle y bandejas)

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Las vistas de operación seguían con problemas de UX: filtros sin retroalimentación, un alta
apilada sin jerarquía, y un detalle con el rail sobrecargado, la columna principal vacía y todas
las acciones como botones planos. El patrón de detalle con **activity feed + rail** se aprobó para
esta etapa.

## Decisión

- **Lista** (`/tickets`): toolbar en tarjeta, **chips de filtros activos** con quitar individual,
  contador de resultados y búsqueda con Enter. La paginación sigue en el servidor.
- **Alta** (`/tickets/nuevo`): **secciones con encabezado** (Ubicación, Clasificación, Solicitante,
  Descripción); dos columnas en escritorio con el aviso de duplicados en el aside; **barra de
  acciones fija**; **aviso de cambios sin guardar** (`useBlocker` + `beforeunload`, desactivado al
  enviar). El aviso de duplicados deja el ámbar fijo y usa tokens.
- **Detalle** (`/tickets/$ticketId`): encabezado con folio, estado y prioridad; **activity feed**
  con icono por evento y línea conectora, agrupado por ciclo; rail fijo con **una acción primaria
  destacada** (`pickPrimaryAction`, dominio puro con pruebas) y el resto en el menú "Más acciones".
- **Bandejas** (`/inbox`, `/mi-trabajo`): conteo por estado con `TicketStatusSummary`.
- Componentes compartidos nuevos: `FormSection`, `FormActionsBar`, `FilterChips`.

## Alternativas consideradas

- **Mantener todos los botones visibles:** el detalle acumulaba hasta ocho botones sin jerarquía.
- **Bloqueo de navegación con diálogo propio:** se usó `useBlocker` con confirmación nativa y
  `beforeunload`; suficiente y sin componentes nuevos.
- **Tabla en las bandejas:** se mantienen tarjetas por ser listas cortas y de lectura rápida.

## Consecuencias

- Operar un tiquet en escritorio es más claro: se ve el siguiente paso y la actividad.
- Los e2e que pulsaban acciones secundarias se actualizaron para abrir "Más acciones".
- Sin cambios en RPC, RLS, `api/` ni `domain/` de negocio; solo se añadió el selector puro de
  acción primaria.
