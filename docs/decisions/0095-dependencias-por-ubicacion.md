# 0095 — Dependencias solicitantes por ubicación

**Estado:** aceptada; el respaldo “sin vínculos = todas” queda sustituido por el ADR 0097.
**Fecha:** 2026-10-30

## Contexto

`dependencies` era una lista plana: una dependencia se podía elegir en cualquier edificio y
ubicación. En la operación real una dependencia (departamento o área que solicita) atiende ciertas
ubicaciones, una ubicación puede recibir solicitudes de varias dependencias y una dependencia puede
tener ubicaciones en más de un edificio.

## Decisión

- Tabla puente `dependency_locations(dependency_id, location_id)` con clave primaria compuesta e
  índice por `location_id`. Sin `building_id` en `dependencies`: el edificio se deduce de cada
  ubicación.
- **Respaldo por compatibilidad:** una dependencia sin vínculos se ofrece en todas las ubicaciones.
  En cuanto tiene al menos un vínculo, solo se ofrece en esas ubicaciones. Así una instalación
  existente sigue funcionando mientras se configuran los vínculos.
- `GET /api/catalogs/dependencies?locationId=…` filtra por ubicación (vinculadas + respaldo).
- El alta y la recaptura validan el par dependencia–ubicación en el servidor cuando cambia el
  edificio, la ubicación o la dependencia. No se reescriben tiquets históricos.
- Administración: acción **Ubicaciones** en la fila de cada dependencia, con casillas agrupadas por
  edificio. `GET/PUT /api/admin/catalogs/dependencies/:id/locations` con `catalog.manage`.
- XLSX: hoja **Dependencia–Ubicación** con una fila por vínculo. Al importar, cada dependencia
  presente en esa hoja queda exactamente con las ubicaciones listadas (una fila con ubicación vacía
  deja la dependencia sin vínculos). Si una fila de la dependencia es inválida, no se reemplaza nada
  de ella y se reporta. Las dependencias ausentes no se tocan.

## Alternativas consideradas

- **Una dependencia pertenece a un solo edificio** (`dependencies.building_id`): más simple de
  mostrar, pero impide departamentos con ubicaciones en varios edificios.
- **Filtro solo en la interfaz**: no protege la API ni la importación.
- **Reemplazar la tabla plana por una jerarquía edificio → dependencia**: obliga a duplicar
  dependencias por edificio y rompe los vínculos actuales.

## Consecuencias

- Una dependencia puede aparecer en varias ubicaciones y una ubicación en varias dependencias.
- Las dependencias sin vínculos quedan como “disponibles en todas” hasta configurarlas.
- Cambiar la relación no altera los tiquets históricos ni las métricas por dependencia.
- La importación de vínculos es la única parte del XLSX que reemplaza datos (solo la relación de
  las dependencias listadas), porque es la forma de corregir asignaciones.
