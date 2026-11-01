# 0105 — Detección y revisión de duplicados

**Fecha:** 2026-10-31
**Estado:** aceptada

## Decisión

La detección de duplicados usa una sola consulta para el aviso previo y para el alta: tiquets no
finales del mismo edificio dentro de una ventana configurable. Son candidatos los que coinciden en
**ubicación y problema**, o los que superan el umbral de similitud trigram del texto normalizado
(minúsculas y acentos). Un puntaje compuesto añade subcategoría y dependencia para ordenar los
candidatos y explicar por qué coinciden. La ventana, el umbral y los campos visibles se editan en
Configuración y la proyección del aviso respeta esos campos.

El aviso registra los candidatos que se mostraron y la decisión de la persona con su actor y su
fecha: `ignored` al registrar de todas formas, `linked` al enlazar el original y `dismissed` cuando
un revisor descarta la alerta. El detalle del tiquet muestra las alertas pendientes o ignoradas y
permite enlazar o descartar. Al marcar duplicado se descartan las demás alertas del tiquet. Al
recapturar se eliminan las alertas pendientes y se recalculan con la captura corregida.

El original debe ser visible para quien marca o haber sido mostrado como candidato del tiquet; no
puede ser ya un duplicado ni cerrar un ciclo. Así se conserva el flujo del solicitante que fue
avisado de un tiquet fuera de su ámbito sin permitir enlaces arbitrarios.

## Alternativas y consecuencias

Se prefirió avisar por misma ubicación y problema aunque el texto difiera: es la señal más fuerte de
un doble registro y el aviso no bloquea el alta. La contrapartida es más ruido en ubicaciones
concurridas, visible en los indicadores de alertas ignoradas; el puntaje y los motivos permiten
distinguir una coincidencia exacta de una solo textual. El umbral sigue existiendo para detectar
casos parecidos en otra ubicación.

El aviso previo deja de filtrar por el ámbito de quien registra para poder avisar de un duplicado
de otra persona. La frontera de privacidad es `duplicate_shown_fields`: si no se quiere exponer el
contacto, se excluye de la configuración. Las decisiones quedan auditadas en la tabla de candidatos;
no se creó un evento de bitácora separado porque no cambia el estado del tiquet.

Duplicar un tiquet sigue siendo una acción explícita; no hay fusión automática. Las alertas que
llegan sin aviso previo (por ejemplo, desde la API o una creación offline) quedan pendientes para
que un revisor decida.
