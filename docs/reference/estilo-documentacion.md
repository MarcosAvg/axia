# Criterios de documentación

La documentación describe el Axia disponible. El [índice](../README.md) asigna una referencia a cada
tema; un documento nuevo debe resolver una necesidad que los existentes no cubran.

## Organización

- README presenta el producto y sus entradas; no reproduce instalación, comandos y configuración.
- Las guías explican tareas; las referencias reúnen contratos y tablas de consulta.
- Arquitectura explica componentes y razones técnicas. La especificación de negocio se conserva
  como autoridad normativa y no se reescribe para ajustarla a limitaciones del código.
- Se enlaza una regla existente en lugar de copiarla. Los detalles actuales se contrastan con
  código, scripts, plantillas o pruebas; el historial no certifica el comportamiento disponible.
- Una capacidad futura o una discrepancia conocida se identifica como tal y se registra en estado.
- Los diseños y planes concluidos se recuperan desde Git. Los ADR nuevos explican decisiones con
  alternativas y consecuencias duraderas; no son notas de cada corrección o pantalla.

## Redacción

Usar español es-MX, títulos en oración y nombres coherentes con el glosario. Las guías operativas
usan infinitivo o forma impersonal, sin contexto de la conversación, elogios ni promesas. Explicar
qué se necesita, los pasos, el resultado verificable y cómo recuperar un fallo cuando corresponda.
Omitir secciones vacías y detalles internos que no cambien una decisión del lector.

Los comandos se ejecutan desde la raíz que indique la guía. Los ejemplos usan valores ficticios,
identifican pasos destructivos y no imprimen secretos. Las variables completas se documentan solo
en configuración. Una guía referencia ese contrato y explica únicamente las opciones de su tarea.

## Enlaces y comprobación

Usar enlaces Markdown relativos dentro del repositorio; preferir destinos concretos a nombres de
archivo sin enlace. Para fuentes externas, enlazar documentación oficial que sustente la afirmación.
No afirmar que una opción, default o límite de un proveedor externo permanece vigente sin verificarlo.

Comprobar enlaces con `pnpm check:docs` y ejemplos con sus consumidores reales cuando sea seguro.
La documentación del paquete operativo debe seguir disponible en el paquete; no convertir sus
instrucciones esenciales en enlaces que requieran el checkout. No añadir pruebas que comparen
texto por texto la prosa. Registrar límites y comprobaciones reales en la memoria de trabajo.
