# 0100 — Contratos, alcance y fuentes canónicas

**Fecha:** 2026-10-31
**Estado:** aceptada; sustituye el punto 3 de ADR 0067.

## Contexto

La segunda revisión estructural encontró definiciones repetidas que divergían: parsers web de un
contrato antiguo, comandos sin correlación entre operación y argumentos, autorización especial
para métricas y una introspección del esquema que ningún repositorio consumía. El servidor
bloqueaba acciones dependientes solo dentro de un lote, mientras la cola enviaba lotes de un
elemento. Los verificadores recorrían también archivos ajenos a las fuentes y sus pruebas
manipulaban el texto del ejecutor.

## Decisión

1. **Frontera HTTP vigente.** Validar con Zod las respuestas camelCase reales de listas, detalle,
   tiempos, historial y calificación. Los formularios conservan sus validaciones. Un
   `TicketCommand` discriminado mantiene operación y argumentos juntos desde hooks hasta el
   transporte inmediato o la cola; conserva UUID, proxy, hora y marca de ajuste manual. Se retiran
   los wrappers y conversiones intermedias sin responsabilidad propia. No se añade un paquete
   compartido ni generación de SDK para este único cliente.
2. **Autorizar antes de agregar.** Métricas usa el mismo `scopePredicate` que tiquets. El conjunto
   visible se intersecta con los filtros antes de contar, promediar o agrupar; una concesión repetida
   no duplica filas ni un ámbito de edificios vacío se interpreta como todo el equipo. Resumen y
   actividad conservan `ticket.view`; las métricas detalladas conservan `metrics.view`. Las
   consultas parametrizadas reemplazan llamadas por concesión y sumas posteriores en JavaScript.
   Las funciones SQL históricas permanecen por compatibilidad y no se editan migraciones
   integradas. No se modifican fórmulas, zona horaria ni contratos públicos.
3. **Una definición del esquema.** Las migraciones SQL son la fuente ejecutable completa. Se
   elimina `src/db/schema.ts`, importado únicamente al crear la conexión y sin consultas tipadas
   que lo utilizaran. Drizzle conserva `execute(sql)` y transacciones; los repositorios conservan
   tipos explícitos de sus resultados. Esta limpieza de TypeScript no altera la base ni necesita
   una migración. Sustituye el punto 3 de ADR 0067.
4. **Dependencias persistentes en la cola.** Una clave opcional de orden, el ID del tiquet, enlaza
   evidencia y acciones. Cada procesamiento considera también errores y envíos activos anteriores:
   bloquean ese tiquet, mientras otros avanzan. El bloqueo se deriva de filas persistidas, sin
   duplicar un estado `blocked`. Los registros anteriores sin clave se resuelven mediante sus
   manejadores (ID de acción o foto local). No cambian los índices de Dexie ni se descartan datos
   locales. Un fallo de red reintenta el anterior; un error definitivo exige reintentar o descartar
   explícitamente desde el aviso existente. Después de resolverlo, el servidor vuelve a validar
   las siguientes acciones. Cambiar de usuario interrumpe el resto del procesamiento. No se
   agrupan fotos TUS y acciones HTTP en una transacción ficticia.
5. **Herramientas sobre fuentes.** Ambos verificadores usan un inventario Git delimitado por NUL:
   archivos versionados y nuevos no ignorados, regulares, sin symlinks. Un filtro adicional excluye
   dotenv privados, claves, credenciales, backups, evidencias y salidas generadas incluso si fueron
   añadidos por accidente. Se admiten solo plantillas de entorno conocidas. El selector de pruebas
   separa un planificador puro de descubrir Git y ejecutar comandos; los errores de descubrimiento
   siguen seleccionando la compuerta completa.
6. **Referencias actuales.** Dominio describe acciones transaccionales de Fastify; convenciones y
   datos apuntan al SQL versionado. Pruebas usan los valores locales seguros por defecto y bases
   exclusivas definidos por ADR 0099. No se introduce otro sistema de configuración o despliegue.

## Pruebas sustituidas y garantías

- Los parsers snake_case de tiquets solo se consumían en sus propias pruebas y no validaban HTTP.
  Se sustituyen esas pruebas por respuestas `fetch` camelCase reales, válidas e inválidas, para
  cada lectura de tiquets; se mantiene cobertura de formularios y candidatos duplicados.
- Se elimina `mergeBy`, ya innecesario al agregar una sola vez en SQL, y sus pruebas artificiales.
  Se reemplazan por pruebas HTTP contra PostgreSQL de normalización numérica/intervalos y
  equivalencia de métricas, además de pruebas directas de formato.
- Las pruebas del selector ya no reescriben código ni lo ejecutan en una VM. Los veinte escenarios
  anteriores se conservan como entradas del planificador y pruebas CLI. Fixtures con secretos
  ficticios y una guardia de lectura comprueban que archivos excluidos nunca se abren; el código
  fuente normal sigue detectando los nombres prohibidos.
- Las regresiones reproducen contratos incompletos, filtros fuera del alcance, concesiones
  repetidas, edificios vacíos y colas con errores, red interrumpida, evidencia previa y cambio de
  sesión. La compuerta completa verifica también el esquema aplicado desde SQL.

## Consecuencias y límites

Menos representaciones paralelas y capas sin función propia, sin dependencias nuevas ni cambio de
stack. Los contratos web y servidor siguen separados y requieren actualizar sus pruebas juntos
cuando cambie HTTP. La exclusión de archivos privados usa nombres y ubicaciones conocidos: no es
un detector universal de secretos. El bloqueo offline mantiene la serialización existente dentro
de esta pestaña; no añade coordinación entre pestañas. La idempotencia del servidor sigue siendo
necesaria. Las acciones ofrecidas por la interfaz según permisos/estado y la zona horaria de
métricas quedan fuera de esta consolidación.
