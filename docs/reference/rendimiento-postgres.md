# Diagnosticar rendimiento de PostgreSQL

Utilizar esta guía cuando una consulta o la base muestre lentitud. No hay un objetivo de capacidad
validado para cualquier instalación: medir con datos, distribución de usuarios y concurrencia
representativos antes de cambiar parámetros o índices. Para salud, limpieza y respaldos, consultar
[Operación](../guides/operacion.md).

## Identificar el problema

1. Anotar la operación lenta, duración, volumen de datos y concurrencia; distinguir API, subida de
   evidencia y base de datos.
2. Revisar logs de app, espacio disponible y conexiones antes de cambiar el esquema.
3. Reproducir la consulta con los mismos filtros y alcance del usuario en una copia de prueba.
4. Comparar el plan y duración antes y después de un único cambio. Registrar datos y parámetros
   usados; una cifra sin ese contexto no demuestra una mejora.

El pool de app tiene un máximo de 10 conexiones por proceso, con espera de conexión de 10 segundos
y liberación de conexiones ociosas a los 30 segundos. SSE utiliza una conexión dedicada para
`LISTEN/NOTIFY`; el migrador usa otra conexión. Los parámetros de PostgreSQL aplicados por el
Compose de producción se consultan en [Configuración](configuracion.md#parámetros-de-postgresql-en-producción).
No añadir un pooler, réplicas o particiones como respuesta automática a lentitud.

## Revisar consultas e índices

En una copia con datos representativos y una sesión SQL autorizada, usar
`EXPLAIN (ANALYZE, BUFFERS)` para la consulta concreta. `ANALYZE` ejecuta la consulta: no usarlo sobre
una escritura real sin preparar su aislamiento y recuperación. Revisar tiempo total, filas
estimadas frente a reales, filtros, ordenamientos y lecturas de bloques.

El comando disponible para auditar índices es:

```bash
pnpm db:indexes
```

**Antes de ejecutarlo:** `apps/server/scripts/index-audit.ts` carga automáticamente `.env` de la
raíz si existe, y usa `DATABASE_URL` o, en su ausencia, `MIGRATION_DATABASE_URL`. No selecciona
`.env.dev` ni respeta `AXIA_ENV_FILE`. Usarlo en un checkout de diagnóstico sin archivo `.env`
privado, con la conexión de la copia de prueba proporcionada al proceso de forma segura; no asumir
que apunta a desarrollo. No imprimir la URL ni copiar contraseñas a comandos o historial.

El informe muestra:

| Resultado | Qué revisar |
|---|---|
| FKs sin índice que cubra todas sus columnas | Consultas que filtran o unen esas columnas; confirmar con el plan antes de crear un índice |
| Hasta 20 índices no únicos con cero lecturas, ordenados por tamaño | Tiempo y carga cubiertos por las estadísticas; cero lecturas no autoriza a borrar un índice |
| Actividad por tabla | Filas estimadas, filas muertas, recorridos secuenciales/por índice y fechas de análisis |

La búsqueda de cobertura de FKs comprueba índices válidos no parciales y presencia de columnas;
no prueba que su orden o selectividad sirvan para una consulta concreta. Las estadísticas de una
base recién creada, reiniciada o sin tráfico representativo no son concluyentes.

No indexar todas las FKs por defecto. Un recorrido secuencial puede ser adecuado si la consulta lee
muchas filas. Antes de añadir o retirar un índice, medir también escrituras y espacio y comprobar
que no sostiene una restricción o consulta menos frecuente. La definición vigente de índices vive
en las [migraciones SQL](../../apps/server/db/migrations/), no en un inventario duplicado aquí.

## Cambiar índices mediante migración

Todo cambio de esquema se agrega en una migración nueva. El runner admite una sentencia no
transaccional por archivo con el marcador:

```sql
-- axia:no-transaction
create index concurrently if not exists idx_example on public.tickets (status);
```

El ejemplo ilustra el formato; no es una recomendación de índice. Una migración no transaccional
se registra cuando termina la sentencia y no tiene rollback automático: debe ser idempotente y
revisarse su estado antes de reintentar un fallo. No modificar migraciones integradas. Véanse
[Convenciones](convenciones-codigo.md) y [Datos](../concepts/datos.md).

## Mantenimiento y ajuste

Revisar `n_dead_tup`, `last_autovacuum` y `last_autoanalyze` en `pg_stat_user_tables` para identificar
acumulación de filas muertas o estadísticas antiguas. Después de una carga grande, evaluar
`ANALYZE` sobre las tablas afectadas. No programar reescrituras o reconstrucciones de tablas como
limpieza rutinaria sin medir su necesidad y bloqueo.

Antes de aumentar memoria o conexiones, medir memoria disponible y consumo bajo concurrencia;
los parámetros de [Configuración](configuracion.md) son valores iniciales del proyecto, no una
fórmula ajustada al host. Registrar el problema observado, cambio y resultado antes de conservarlo.
Las copias y la recuperación siguen el procedimiento coordinado de
[Operación](../guides/operacion.md#respaldos-y-recuperación), no copias del directorio de PostgreSQL
en uso.

La optimización debe conservar permisos y alcance de las consultas. Los repositorios aplican la
autorización; una consulta SQL directa o un plan rápido no demuestran aislamiento entre usuarios.
Los cambios en consultas con alcance requieren pruebas positivas y negativas de permisos.
