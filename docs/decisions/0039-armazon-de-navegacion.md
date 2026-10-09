# 0039 — Armazón de navegación con sidebar y búsqueda global

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

El armazón original era una sola cabecera con los destinos en línea (`flex-wrap`) dentro de un
contenedor `max-w-5xl`, y la administración añadía una segunda fila de enlaces. Con muchos
destinos, en pantallas medianas se envolvían en varias filas y no había jerarquía ni uso del
ancho en escritorio. Faltaba navegación persistente, estado activo claro, migas de pan y una
búsqueda rápida.

## Decisión

Reemplazar el armazón por un **layout de escritorio** en un nuevo feature `features/shell`:

- **Barra lateral** persistente y colapsable en escritorio; **cajón** (`Sheet`) en móvil.
  Navegación agrupada por áreas: Operación, Análisis, Administración y Cuenta, con iconos y
  estado activo visible.
- **Barra superior** con migas de pan, búsqueda global, indicador offline, selector de tema y
  menú de usuario.
- **Búsqueda global** (paleta de comandos, `Cmd/Ctrl+K`) con navegación rápida y búsqueda de
  tiquets por folio, reutilizando la búsqueda existente.
- La administración deja de tener su propia barra; pasa a ser un área del sidebar.
- El armazón **sale de `features/auth`** (que queda centrado en sesión e identidad); las rutas
  importan `AppShell` desde `@/features/shell`.

Para no sobrescribir los componentes de shadcn/ui ya vendored (el CLI pedía reemplazar `button`,
`input`, `sheet`, etc.), el sidebar se compone sobre las primitivas existentes; la búsqueda usa
el `Dialog` existente en lugar de añadir `cmdk`. Esto evita una dependencia nueva y respeta el
principio de "simple antes que ingenioso".

## Alternativas consideradas

- **Bloque `sidebar` de shadcn/ui:** potente, pero el CLI exigía sobrescribir componentes ya
  vendored y arrastraba `cmdk`; se descartó por riesgo y peso.
- **Mantener la cabecera horizontal y solo estilarla:** no resuelve la jerarquía ni el uso del
  ancho en escritorio.
- **Armazón dentro de `features/auth`:** mezcla responsabilidades; se prefiere un feature propio.

## Consecuencias

- Navegación clara en escritorio y funcional en móvil; el contenido usa el ancho disponible.
- Un único lugar define los destinos (`features/shell/components/nav-items.tsx`).
- `features/shell` importa la API pública de `features/auth` y `features/tickets` (permitido por
  la sección 4 de convenciones).
- La búsqueda global cubre navegación y folio; buscar por descripción puede ampliarse después.
- Los e2e que buscaban enlaces de la barra superior se ajustaron a la nueva navegación.
