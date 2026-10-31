# 0101 — Retirar objetos y documentación sin vigencia

**Fecha:** 2026-10-31
**Estado:** aceptada; completa la limpieza de ADR 0100.

## Contexto

El checkout aún contenía diseños e informes de etapas terminadas, decisiones de implementación
del stack retirado clasificadas como vigentes y tablas del importador externo deshabilitado. Los
agregadores SQL anteriores a ADR 0100 tampoco tenían llamadas desde servidor/scripts: las
métricas HTTP ya se calculan con consultas parametrizadas sobre el conjunto autorizado.

## Decisión

1. **Historia en Git.** Retirar doce ADR ya archivados, ADR 0031/0035 obsoletos, tres documentos
   históricos de UI/modelo, la auditoría estructural resuelta y dos planes concluidos. El índice
   [histórico](../history/README.md) conserva rutas y el commit `488862f` para recuperarlos con
   `git show`. El plan de esta limpieza también se retira al terminar y su commit final queda en
   ese índice. Se conserva el documento de integraciones exigido por AGENTS.md. Los ADR con
   criterios funcionales vigentes y detalles técnicos sustituidos se marcan como parciales y
   enlazan los reemplazos actuales; no se reescribe su historia como si el stack nunca cambiara.
2. **Retirada SQL explícita.** Añadir `0017_remove_retired_objects.sql`; ningún archivo aplicado se
   edita. Se retiran `catalog_aliases`, `catalog_import_rows`, `catalog_import_runs`,
   `catalog_import_specs`, `import_records`, `import_batches`, `import_status_map` e
   `integration_tasks`. El XLSX vigente usa especificaciones TypeScript y las rutas CRUD de
   catálogos; no utiliza esas tablas. Se retiran diez funciones de agregación `metrics_*` y su
   auxiliar `metrics_dims_in`. Se conserva `metrics_date_in`, consumido por las consultas actuales.
3. **No perder datos por limpieza.** Antes de retirar, bloquear cada tabla con `ACCESS EXCLUSIVE`
   y comprobar que esté vacía. Mantener los bloqueos hasta el commit impide insertar entre la
   comprobación y el DROP. Si hay filas, abortar con mensaje e indicación de exportación/revisión
   por el operador. No se copia, transforma ni borra automáticamente ninguna fila histórica. El
   límite local de espera de bloqueo es cinco segundos: una tabla ocupada hace fallar la
   actualización de manera reversible. Los DROP usan `RESTRICT`; una dependencia inesperada
   revierte el archivo completo y no registra la migración aplicada.
4. **Conservar garantías activas.** Cuentas, sesiones, tiquets, eventos, idempotencia y tiempos no
   cambian. Se conservan `external_systems` y `ticket_external_refs`, su llave foránea y permisos;
   también las compatibilidades de cola, historial de migraciones y scripts operativos. Web Push
   y escalamiento continúan como pendientes expresos, sin retirada ni activación.
5. **Referencias ejecutables actuales.** Eliminar la condición de una ruta de esquema inexistente
   en el selector y el comentario que ligaba XLSX a la tabla retirada. El smoke compara historial
   de la imagen con el número de archivos SQL del checkout, conservando adopción del historial
   sin hashes, backup y recuperación. Corregir RLS en la guía y el glosario de imagen única.

## Pruebas y expectativas actualizadas

La prueba de objetos debe describir el esquema instalado actual, no congelar una etapa anterior.
Los recuentos cambian de 59 a 51 tablas, de 34 a 23 funciones y de 33 a 29 llaves hacia usuarios;
se conservan las 15 vistas y los 17 enums. El historial pasa de 17 a 18 migraciones. Se actualizan
esas expectativas sin retirar aserciones de permisos, integridad, índices ni huellas.

Las nuevas pruebas aplican exactamente el historial hasta 0016 desde una plantilla de pruebas,
cargan una demo ficticia y verifican actualización a 0017 conservando cuentas, tiquets, eventos,
referencias y huellas anteriores. Cada una de las ocho tablas se prueba con filas: se espera
rechazo sin pérdida ni DDL parcial. Una vista inesperada comprueba `RESTRICT` y rollback; se
verifican también repetición y permisos positivos/negativos del rol de aplicación. No se añaden
pruebas artificiales de texto para prosa ni para retirar una condición sin ruta existente.

Una escritura concurrente se confirma mientras la migración espera al escritor: debe conservarse
la fila y abortar la retirada. La prueba falló al omitir temporalmente el bloqueo y pasó al
restaurarlo. El mensaje de exportación/revisión se incluye en la excepción principal porque el
runner no propaga los campos HINT de PostgreSQL.

## Operación y límites

Si una instancia contiene datos en esas tablas, la actualización queda bloqueada de forma
intencionada. Realizar un [respaldo coordinado](../guides/operacion.md), exportar y revisar las
filas antes de autorizar su vaciado y volver a ejecutar migraciones. No vaciar tablas solo para
forzar el arranque. El historial en Git conserva el diseño retirado, no reemplaza un respaldo de
los datos de una instancia. Esta tarea no toca producción ni añade un importador o archivo de
datos paralelo.
