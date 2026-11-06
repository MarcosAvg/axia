# Tableros de bandeja — Diseño

**Fecha:** 2026-11-06
**Estado:** aprobado

## Intención

Añadir una vista de tablero de **solo lectura** a **Bandeja** y **Mi trabajo**, como alternativa
adicional a las listas actuales. Las bandejas conservan su diseño; solo se agrega un botón
«Ver tablero» en su encabezado y un «Ver lista» en el tablero para volver.

## Qué se construye

- Dos rutas nuevas, no anidadas para no tocar el layout de las bandejas:
  - `/inbox/tablero` (permiso `ticket.take_offer`).
  - `/mi-trabajo/tablero` (permiso `ticket.view` y perfil de técnico).
- Columnas con los siete estados activos, en orden de flujo: Registrado, Con supervisor,
  Asignado, En proceso, Pausado, Atendido y En reclamación. Cada columna muestra su conteo y
  permanece visible aunque esté vacía.
- Tarjeta con folio, prioridad, descripción, edificio · categoría, solicitante, antigüedad e
  insignias de oferta, sin ruteo, posible duplicado y sin sincronizar. El clic abre el detalle.
- **Bandeja:** se muestran los tiquets del equipo con los mismos filtros de la lista (búsqueda,
  edificio y categoría). Las ofertas para la persona se marcan con «Oferta para ti»; no se
  duplican tarjetas, porque las ofertas ya forman parte del ámbito visible del supervisor.
- **Mi trabajo:** se muestran los tiquets asignados al técnico, sin filtros, igual que su bandeja.
- Hasta 100 tiquets activos (máximo de la API). Si el total es mayor, se avisa y se enlaza a la
  lista para ver el resto.
- Móvil: columnas de ~80 % del ancho con desplazamiento horizontal.

## Fuera de alcance

- Arrastrar tarjetas o cambiar estados desde el tablero. Todo cambio sigue siendo una acción del
  servidor con sus datos, permisos e historial.
- Estados finales (cerrado, rechazado, cancelado, duplicado).
- Cambios de base de datos, API o dependencias.

## Decisiones

- El agrupamiento es una función pura en `features/tickets/domain/board.ts`, con pruebas.
- El tablero reutiliza `TicketListItem`, las consultas existentes y la proyección de acciones
  offline, de modo que una tarjeta refleja los cambios pendientes igual que la lista.
- Las rutas usan el guion bajo de TanStack Router (`inbox_.tablero.tsx`,
  `mi-trabajo_.tablero.tsx`) para colgar de `_authenticated` sin anidarse bajo las páginas de
  bandeja, que no renderizan `Outlet`.
- `fetchTickets` y `useTicketsList` admiten un tamaño de página opcional; el tablero pide 100 y
  la lista conserva 20.
- `TicketFilters` admite ocultar el filtro de estado, que en el tablero se expresa como columnas.

## Riesgos y límites conocidos

- Un equipo con más de 100 tiquets activos verá solo los 100 más recientes; el aviso lo hace
  explícito. Si hiciera falta, una iteración posterior puede consultar por columna.
- Las ofertas que quedaran fuera de esos 100 no aparecerían en el tablero; siguen visibles en la
  sección de ofertas de la bandeja.
