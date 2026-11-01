# 0105 — Detección y revisión de duplicados

**Fecha:** 2026-10-31
**Estado:** aceptada

## Decisión

La detección de duplicados usa una sola consulta para el aviso previo y para el alta: tiquets no
finales del mismo edificio, dentro de una ventana configurable, con problema o categoría afín y
similitud trigram del texto normalizado (minúsculas y acentos) por encima del umbral configurable.
Un puntaje compuesto añade coincidencias exactas de ubicación, problema, subcategoría y dependencia
para ordenar los candidatos y explicar por qué coinciden. La ventana, el umbral y los campos
visibles se editan en Configuración y la proyección del aviso respeta esos campos.

El aviso registra los candidatos que se mostraron y la decisión de la persona con su actor y su
fecha: `ignored` al registrar de todas formas, `linked` al enlazar el original y `dismissed` cuando
un revisor descarta la alerta. El detalle del tiquet muestra las alertas pendientes o ignoradas y
permite enlazar o descartar. Al marcar duplicado se descartan las demás alertas del tiquet. Al
recapturar se eliminan las alertas pendientes y se recalculan con la captura corregida.

El original debe ser visible para quien marca o haber sido mostrado como candidato del tiquet; no
puede ser ya un duplicado ni cerrar un ciclo. Así se conserva el flujo del solicitante que fue
avisado de un tiquet fuera de su ámbito sin permitir enlaces arbitrarios.

## Alternativas y consecuencias

El umbral sigue aplicándose al parecido del texto para no llenar de avisos cualquier alta en un
edificio muy transitado; el puntaje compuesto es explicable en la interfaz (“95 % de coincidencia ·
misma ubicación, mismo problema”) y hace visible por qué se mostró. La contrapartida es que dos
tiquets con la misma ubicación y problema pero descripciones muy distintas no se avisan si el texto
no alcanza el umbral; se prefiere ese silencio al ruido.

El aviso previo deja de filtrar por el ámbito de quien registra para poder avisar de un duplicado
de otra persona. La frontera de privacidad es `duplicate_shown_fields`: si no se quiere exponer el
contacto, se excluye de la configuración. Las decisiones quedan auditadas en la tabla de candidatos;
no se creó un evento de bitácora separado porque no cambia el estado del tiquet.

Duplicar un tiquet sigue siendo una acción explícita; no hay fusión automática. Las alertas que
llegan sin aviso previo (por ejemplo, desde la API o una creación offline) quedan pendientes para
que un revisor decida.
