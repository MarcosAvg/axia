# Buscador de problemas en el registro de tiquets

## Intención y alcance

Facilitar la selección de un problema existente sin conocer su nombre exacto ni
su clasificación. El usuario confirmó que la búsqueda debe cubrir todo el catálogo.
Es un cambio acotado al registro de tiquets y a la lectura de sus catálogos.

## Comportamiento propuesto

- Añadir un campo «Buscar problema» antes de los selectores de clasificación.
- Buscar en todos los problemas disponibles para el registro, aunque ya haya una
  categoría o subcategoría seleccionada.
- Admitir fragmentos, diferencias de mayúsculas y acentos y pequeños errores de
  escritura, incluida la transposición de letras («lamapra» → «Lámpara»).
- Mostrar primero las coincidencias más cercanas y acompañar cada problema con
  su categoría y subcategoría para distinguir nombres repetidos.
- Seleccionar siempre mediante una acción explícita. Al elegir un resultado,
  completar categoría, subcategoría y problema de forma coherente.
- Conservar los selectores actuales como alternativa. Escribir una búsqueda sin
  elegir un resultado no modifica la clasificación del tiquet.
- Mantener las reglas actuales de prioridad, equipo y adjuntos del problema elegido.
- Ofrecer navegación por teclado, foco visible y estados de carga, error y sin resultados.

## Alternativas consideradas

1. Buscar dentro de la subcategoría seleccionada: requiere menos cambios, pero exige
   conocer previamente la clasificación. El usuario eligió buscar en todo el catálogo.
2. Buscar en todo el catálogo y completar la clasificación: opción elegida; permite
   encontrar directamente un problema por su nombre aproximado.

Como decisión técnica propuesta, reutilizar las capas de catálogos y el caché de
consultas existentes y resolver las coincidencias en una función pura del cliente,
sin dependencias nuevas ni servicios externos. La lectura actual de problemas exige
subcategoría; se adaptará para poder obtener el catálogo completo con los mismos
permisos y reglas de disponibilidad. No se requieren cambios del esquema de datos.

## Límites y decisiones de implementación

La búsqueda aproximada compara texto; no interpreta sinónimos ni inventa problemas.
El implementador fijará y probará un umbral conservador para errores de escritura y
un límite de resultados visibles, priorizando coincidencias exactas y parciales.
No modifica la recaptura, los permisos ni las reglas de negocio del registro.

## Verificación prevista

- Pruebas unitarias de normalización, fragmentos, errores, orden y ausencia de coincidencias.
- Pruebas de selección entre distintas categorías y de conservación de los selectores.
- Pruebas de API con y sin permiso para la lectura del catálogo completo.
- Flujo Playwright de búsqueda y selección durante el registro.
- Ejecutar `pnpm check:fast`, `pnpm test:affected`, integración PostgreSQL afectada
  y `pnpm test:e2e:smoke`. Antes de integrar a `main`, ejecutar `pnpm check`.
- Actualizar la referencia del comportamiento y el `CHANGELOG.md` con la implementación.

## Estado

Diseño propuesto, pendiente de aprobación antes de implementar.
