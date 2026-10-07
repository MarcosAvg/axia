# 0006 — Independencia del núcleo respecto de plataformas externas

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Hoy buena parte de los datos de mantenimiento vive en sistemas de terceros (una plataforma de
reporte y hojas de cálculo). Axia debe ser una **plataforma propia**: que los tiquets se creen,
asignen, ejecuten, pausen, resuelvan y midan dentro de Axia, sin que ningún sistema externo sea
requisito, fuente de verdad ni parte de su diseño.

## Decisión

- El **núcleo de Axia funciona completo por sí solo**. Ninguna plataforma externa es requisito.
- Toda integración vive detrás de **adaptadores aislados**: `apps/web/src/features/integrations/`
  y `supabase/functions/integration-*`. Se pueden añadir o quitar sin tocar el núcleo.
- El núcleo trata a los sistemas externos como **datos genéricos**: `system` en
  `ticket_external_refs`, `source` en los eventos, `channel` en los tiquets. No contiene nombres,
  campos, estados ni reglas de otra plataforma.
- Las integraciones son **opcionales y, por defecto, de entrada** (importar). Nada en Axia queda
  esperando a que otro sistema se actualice.
- Lo verifica **`pnpm check:agnostic`**, con una lista configurable de nombres de terceros y rutas
  permitidas.

## Alternativas consideradas

- **Modelar el núcleo según la plataforma de origen:** acopla Axia a un sistema que puede
  desaparecer y contamina el esquema, los enums y la interfaz.
- **Depender de la plataforma para el seguimiento:** contradice el propósito de Axia.

## Consecuencias

- El núcleo es estable y portable; el despliegue funciona sin ninguna integración.
- Prueba de fuego ante la duda: *¿Axia funcionaría igual si esa plataforma dejara de existir?* Si
  la respuesta es no, algo está mal ubicado.
- Migrar datos históricos es una tarea de adaptador, no del núcleo.
- Añadir o quitar una integración no modifica el núcleo.
