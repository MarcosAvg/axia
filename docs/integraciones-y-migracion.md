# Integraciones y migración de datos

> **Estado actual:** las importaciones e integraciones externas están deshabilitadas en esta versión.
> Este documento se conserva como referencia del origen histórico de los datos y de futuros adaptadores.


## Objeto

Describir la migración de datos hacia Axia y la convivencia con el sistema de origen. Documento de
trabajo para importadores e integraciones.

> **Advertencia:** este es el único documento (junto con el código de los adaptadores,
> `docs/ESTADO.md` y `docs/decisions/`) donde pueden aparecer nombres de plataformas de terceros. El
> núcleo de Axia no debe depender de nada de lo que sigue.

## Contenido

1. [Principios](#1-principios)
2. [Contrato de un adaptador](#2-contrato-de-un-adaptador)
3. [Origen actual (referencia)](#3-origen-actual-referencia)
4. [Reglas de importación](#4-reglas-de-importación)
5. [Numeración y continuidad](#5-numeración-y-continuidad)
6. [Tiquets importados y seguimiento detallado](#6-tiquets-importados-y-seguimiento-detallado)
7. [Funciones opcionales de convivencia](#7-funciones-opcionales-de-convivencia-mientras-ambos-sistemas-existan)
8. [Preguntas abiertas y supuestos](#8-preguntas-abiertas-y-supuestos)
9. [Criterio de aceptación de la migración](#9-criterio-de-aceptación-de-la-migración)

## 1. Principios

1. **Axia es independiente.** Todo lo de este documento es opcional y se puede quitar sin afectar
   el núcleo.
2. **Referencia, no dependencia.** Los sistemas descritos aquí son el origen *actual* de los
   datos. Sirven para migrar y, mientras convivan, para alimentar a Axia.
3. **Adaptadores aislados.** Cada fuente es un adaptador en `apps/web/src/features/integrations/`
   (interfaz) o `supabase/functions/integration-<nombre>/` (proceso). El núcleo no los importa;
   ellos sí usan la API pública del núcleo.
4. **Por defecto, de entrada.** Se importa hacia Axia. Una integración de salida (avisar o
   escribir en otro sistema) se considera una función aparte y opcional (sección 7).
5. **Idempotentes y repetibles.** Reimportar nunca duplica ni destruye.
6. **Sin datos reales en el repositorio.** Pruebas y semillas usan datos ficticios.

## 2. Contrato de un adaptador

Todo adaptador cumple el mismo flujo, sea cual sea la fuente (CSV, Excel, API o correos):

```
fuente ─► lectura ─► staging (crudo) ─► normalización ─► mapeo a catálogos (alias)
       ─► dry run (reporte) ─► upsert por (system, external_id) ─► eventos de procedencia
```

Piezas genéricas del núcleo que usan los adaptadores:

- `import_batches`: lote de importación (sistema, fecha, responsable, estado y resumen).
- `import_records`: fila cruda (`raw jsonb`) con su resultado (insertada, actualizada, omitida o error).
- `catalog_aliases`: texto original → registro del catálogo, por tipo de catálogo.
- `import_status_map`: estatus de la fuente → estado de Axia, por sistema.
- `ticket_external_refs`: vínculo `(system, external_id)` con el tiquet de Axia.
- Evento `imported` en `ticket_events` (`source = 'import'`) con el lote como procedencia.

Cada adaptador produce un **tiquet normalizado** con la misma forma (campos del núcleo más
referencias externas) y deja el resto del trabajo al flujo común.

Reglas del flujo:

- **Dry run obligatorio** antes de insertar: reporte de filas válidas, valores sin mapear,
  duplicados y conflictos.
- **Reporte de calidad de datos**: inconsistencias que se señalan pero **no se corrigen**.
- **Nada se pierde**: lo que no encaje en el modelo queda en `import_records.raw`.

## 3. Origen actual (referencia)

Hoy los tiquets se registran en una plataforma externa llamada **Atenda**. Una hoja de Google la
**espeja** y se usa como fuente de datos de trabajo. La cadena actual es: el usuario crea el tiquet
con catálogos → llega a la plataforma → un encargado lo asigna a un supervisor → el supervisor lo
asigna (autoriza) a un técnico → el técnico lo realiza o no.

La plataforma externa tiene limitaciones de diseño, y por eso Axia no se ancla a ella. Se seguirá
usando al menos por ahora; que Axia llegue a ser la única fuente es una decisión pendiente.

### Columnas de la hoja y su destino en Axia

| Columna en la hoja | Destino en Axia | Notas |
|---|---|---|
| ID | `ticket_number` y `ticket_external_refs` (`system = 'sheet'`) | Ver sección 5 sobre numeración |
| EDIFICIO | catálogo `buildings` | Vía alias |
| UBICACIÓN | catálogo `locations` (ligado al edificio) | |
| DEPENDENCIA | catálogo `dependencies` | |
| CATEGORÍA, SUBCATEGORÍA, PROBLEMA | catálogos `categories` → `subcategories` → `problems` | Se guarda `problem_id` |
| DESCRIPCIÓN | `description` | |
| TIPO DE SERVICIO | catálogo `service_types` | |
| PRIORIDAD | catálogo `priorities` | |
| MES | **no se importa** | Se calcula desde `reported_at` |
| FECHA Y HORA DE REPORTE | `reported_at` (`timestamptz`) | Formato `17/jun/2026 - [14:14:00]`, mes abreviado en español |
| ASIGNACIÓN DE TRABAJO | asignación a técnico en `ticket_assignments` | Ver supuestos, sección 8 |
| FINALIZACIÓN DE TRABAJO | `finished_at` | |
| INTERVALO DE ATENCIÓN / TRABAJO / TOTAL | **no se importan** | Se calculan en las vistas de métricas |
| TÉCNICO DE MTTO | catálogo `technicians` + asignación | |
| PLATAFORMA | catálogo `channels` | Canal de origen |
| ID ATENDA | `ticket_external_refs` (`system = 'atenda'`) | Puede faltar |
| CONTACTO, EXTENCIÓN | contacto del solicitante (nombre y extensión) | Las cabeceras tienen erratas: se normalizan |
| AUTORIZACIÓN | asignación de etapa `supervisor` | El supervisor que autoriza |
| ESTATUS | `import_status_map` → estado de Axia | El texto original queda en `import_records.raw` |
| COMENTARIOS | evento `note` | No se interpreta |

## 4. Reglas de importación

- **Marcadores de "sin dato"**: los textos "No atendido" y "No contabilizado" en fechas e
  intervalos son `NULL`, no fechas ni ceros.
- **No corregir el estatus.** Ejemplo real: un tiquet `EN PROCESO` sin fecha de asignación pero
  con técnico. Se respeta el original, se mapea según `import_status_map` y se señala en el
  reporte de calidad de datos.
- **Mapeo de estatus**: se conoce `EN PROCESO` → `in_progress`. Los demás valores se definen cuando
  la persona los proporcione (pregunta abierta 1); mientras tanto, los valores sin mapear
  detienen el lote en el dry run, no se asumen.
- **Alias de catálogos**: los nombres vienen escritos de varias formas ("Edif. A", "Edificio A").
  Se resuelven con `catalog_aliases`, y los no resueltos aparecen en el reporte.
- **Idempotencia**: upsert por `(system, external_id)`; un tiquet puede tener varias referencias
  externas (hoja y plataforma).
- **Fechas**: interpretar la zona horaria configurada; nunca asumir una fija en el código.
- **Tiquets sin ID de la plataforma de origen** son válidos; solo tendrán la referencia de la hoja.

## 5. Numeración y continuidad

Decisión provisional: al importar, el `ticket_number` conserva el ID original de la hoja para que la
gente siga reconociendo sus tiquets, y la secuencia de Axia continúa **después del mayor número
importado**. El ID original queda además como referencia externa. Se registra en un ADR.

## 6. Tiquets importados y seguimiento detallado

Los tiquets importados tienen solo lo que la fuente tenía: sin bloqueos ni evidencias previas. No se
rellenan datos históricos que nunca se capturaron. Cuando alguien da seguimiento detallado a un
tiquet importado (abre un bloqueo, sube evidencias), desde ese momento tiene línea de tiempo
completa. Las métricas avanzadas solo consideran tiquets que cuentan con esos datos.

## 7. Funciones opcionales de convivencia (mientras ambos sistemas existan)

Estas funciones son opcionales, genéricas y no deben nombrar sistemas en el núcleo:

- **Quién manda en un conflicto** (configurable por sistema): para datos de alta, el sistema de
  origen; para el seguimiento, Axia.
- **Tareas de sincronización saliente** (`integration_tasks`): cuando algo cambia en Axia y el
  sistema externo debe reflejarlo manualmente, se crea una tarea con responsable y fecha, en
  lugar de un comentario libre. Es una convención genérica del núcleo; el texto de qué hay que
  actualizar y dónde lo aporta el adaptador.
- **Estado reportado por el sistema externo** (`external_status` en `ticket_external_refs`), para
  detectar diferencias con el estado de Axia sin acoplar el modelo.

Esto resuelve, sin anclar Axia, situaciones como "pendiente actualizar la plataforma".

## 8. Preguntas abiertas y supuestos

Supuestos provisionales (reversibles; se registra un ADR):

1. "Asignación de trabajo" de la hoja = asignación al técnico; "intervalo de atención" =
   reporte → asignación; "intervalo de trabajo" = asignación → finalización.
2. La autorización es la asignación del supervisor al técnico.

Preguntas para la persona (se registran en `docs/ESTADO.md` cuando la tarea dependa de ellas):

1. **Valores distintos de la columna ESTATUS** de la hoja (solo se conoce `EN PROCESO`).
2. ¿La plataforma de origen permite exportar (CSV/Excel), tiene API o envía correos al crear o
   cambiar un tiquet? Define qué adaptador construir. Se comienza por la importación de CSV/Excel.
3. ¿"Asignación de trabajo" significa asignación al técnico o inicio del trabajo?
4. ¿Hay más de una pestaña o año en la hoja? ¿Volumen aproximado de tiquets?
5. ¿Se seguirán registrando tiquets en la plataforma de origen después de que Axia entre en uso?

## 9. Criterio de aceptación de la migración

Las **métricas base** de Axia (conteos y los tres intervalos) deben coincidir con las cifras
actuales de la hoja para el mismo conjunto de datos importado. Se verifica con pruebas que comparan
resultados de las vistas con valores esperados calculados a partir de datos ficticios equivalentes.