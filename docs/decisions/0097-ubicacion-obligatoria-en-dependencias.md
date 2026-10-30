# 0097 — Ubicación obligatoria en las dependencias

**Estado:** aceptada
**Fecha:** 2026-10-30

## Contexto

El ADR 0095 permitió que una dependencia sin vínculos se ofreciera en todas las ubicaciones como
respaldo. En la operación real una dependencia **siempre** pertenece a una o varias ubicaciones;
“sin ubicación” no es un estado válido. El respaldo ocultaba configuraciones incompletas y permitía
crear dependencias vacías desde Administración y desde el XLSX.

## Decisión

- Toda dependencia tiene **al menos una ubicación**. Se mantiene la relación N:M.
- La regla se valida en el servidor:
  - `POST/PATCH /api/admin/catalogs/dependencies` reciben `name`, `active` y `locationIds` con
    mínimo una ubicación, y guardan dependencia + vínculos en una transacción.
  - El alta y la recaptura de tiquets rechazan una dependencia que no esté vinculada a la ubicación.
  - El `POST/PATCH` genérico de catálogos rechaza `dependencies` para que no se pueda crear una
    dependencia vacía por otra vía.
- Administración edita nombre, estado y ubicaciones en **un solo formulario**. Se elimina la acción
  separada “Ubicaciones”.
- XLSX: la hoja **Dependencias** pasa a `Nombre | Activo | Edificio | Ubicación`, con una fila por
  ubicación. Desaparece la hoja separada `Dependencia–Ubicación`. La importación agrupa por nombre,
  exige al menos una ubicación válida y reemplaza los vínculos de las dependencias listadas.
- Migración `0014`: rellena los vínculos existentes con las ubicaciones donde ya se usó la
  dependencia en tiquets; si no tiene historial, con todas las ubicaciones existentes.

## Alternativas consideradas

- **Mantener el respaldo**: sigue permitiendo dependencias vacías y hace impredecible el filtro.
- **Una ubicación por dependencia**: contradice el requisito de varias ubicaciones por dependencia.
- **Trigger diferido en PostgreSQL**: garantiza el invariante incluso por SQL directo, pero
  complica migraciones, semillas y pruebas. La API y la interfaz son los únicos caminos de escritura
  y ya lo validan.

## Consecuencias

- Una instalación con dependencias pero sin ninguna ubicación no puede asignarlas en la migración;
  quedan fuera de los filtros hasta que se cree una ubicación y se editen.
- El respaldo desaparece: si una ubicación no tiene dependencias vinculadas, el alta no ofrece
  ninguna hasta configurarla.
- Los tiquets históricos no se reescriben.
- Reimportar el XLSX reemplaza las ubicaciones de las dependencias presentes en el archivo; las
  ausentes no se tocan.
