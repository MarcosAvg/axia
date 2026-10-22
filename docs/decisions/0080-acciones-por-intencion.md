# 0080 — Acciones del tiquet por intención

## Contexto

El detalle del tiquet mostraba todas las acciones en una fila flexible. En escritorio cada botón
medía distinto, la acción principal podía quedar al mismo nivel que las secundarias y la zona de
descarte solo se separaba con una línea. El resultado era difícil de escanear y mezclaba conceptos
distintos: trabajo, asignación, ajustes, reclamaciones y descarte.

## Decisión

- La acción principal se muestra sola, a todo el ancho y con una explicación breve.
- Las secundarias se agrupan por intención:
  - Trabajo.
  - Asignación.
  - Ajustes.
  - Reclamaciones.
  - Zona sensible.
- La rejilla usa una columna en móvil y dos en escritorio; todos los botones tienen altura táctil
  consistente.
- “Actuar a nombre de” queda en un bloque de contexto separado.
- La zona sensible tiene borde, fondo y título propios.
- La agrupación es una función pura de dominio y la autorización existente no cambia.

## Consecuencias

- Todas las acciones siguen visibles; no se añaden menús ocultos ni dependencias.
- El orden responde a la intención del usuario, no al orden de los permisos.
- Las pruebas cubren agrupación, jerarquía visual, validación, visor y orden móvil.
