# 0057 — Rediseño de Administración (desktop-first)

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

La administración había crecido por tramos y cada pantalla resolvía su propia presentación:

- **Tablas sin especificidad**: `CatalogTable` reducía todas las columnas secundarias a una sola
  celda unida con `·` ("Edificio · Nivel 1 · Sí"), aunque la configuración de cada catálogo
  (`catalogs.ts`) ya declaraba columnas propias. Se perdía la lectura por columna y la alineación.
- **Diálogos básicos y desalineados**: el formulario de alta/edición anidaba un `form` con borde
  dentro del `DialogContent` (borde sobre borde), grid ciego a dos columnas, botones a la izquierda
  con `flex-wrap`, título duplicado y validación que solo señalaba el primer campo obligatorio.
- **Inconsistencia**: usuarios usaban `Switch` y catálogos `Badge`; roles usaban un `<select>`
  nativo con estilos a mano mientras el resto usaba `SelectField`; integraciones usaba `Table` cruda.
- **Selector de catálogos** en fila de "pills" que se envolvía en varias líneas con 13 catálogos.

## Decisión

- **Marco común**: `AdminPage` (encabezado + contenido) en todas las rutas y `AdminToolbar`
  (buscador, contador y acción primaria opcional) en las listas. El inicio `/admin` se agrupa en
  "Catálogos y operación" y "Acceso", con descripción por destino.
- **Catálogos con rail lateral** en escritorio (lista vertical de los 13 catálogos; scroll horizontal
  en móvil) en lugar de las pills.
- **Tablas específicas**: se renderizan las columnas reales de cada catálogo, con **alineación**
  (texto a la izquierda; orden y objetivo a la derecha), relaciones resueltas a nombre, estado como
  **switch** y acciones en **menú `⋯`** (editar / activar-desactivar). El "resumen en una celda"
  desaparece.
- **Búsqueda y orden en cliente**: `lib/sort.ts` (orden estable, natural, vacíos al final) y
  `domain/catalog-list.ts` / `domain/user-list.ts` (texto buscable que incluye las etiquetas de las
  relaciones). Son funciones puras con pruebas.
- **Diálogos unificados**: `EntityDialog` (modal centrado en escritorio, hoja inferior en móvil) y
  `EntityForm` (cuerpo con scroll y pie de acciones fijo) + `FormGroup` (secciones sin borde anidado).
  Los formularios agrupan por tipo: "Datos" y "Opciones". La validación señala **todos** los campos
  inválidos y los números no numéricos.
- **`DataTable` extendida** (compartida con Operación y Métricas): `align`, `sortable`/`onSortChange`
  y `empty`, todo opcional y retrocompatible.
- **Roles y usuarios**: el ámbito de permiso usa el selector con la clase compartida; el alta de rol
  y el editor de roles pasan por el diálogo/`Switch` comunes; usuarios gana barra de búsqueda y
  columnas con acciones.

## Alternativas consideradas

- **Tabla propia de administración**: se descartó para no duplicar y para unificar con Operación.
- **Paginación en el servidor**: innecesaria para los volúmenes de catálogos; se busca/ordena en
  cliente.
- **Mantener pills**: peor lectura con 13 catálogos en escritorio.

## Consecuencias

- Todas las pantallas de administración comparten marco, tablas, estados y diálogo; cada catálogo
  muestra su información real.
- Cambian etiquetas y estructura de las listas, por lo que se ajustaron los e2e (`admin.spec.ts`,
  `admin-roles.spec.ts`).
- Nuevas piezas reutilizables (`AdminPage`, `AdminToolbar`, `EntityDialog`, `EntityForm`, `FormGroup`,
  `RowActions`, `StatusSwitch`) y utilidades puras probadas (`sort`, `catalog-list`, `user-list`).
- Sin cambios de esquema, RPC ni permisos: el rediseño es de interfaz.
