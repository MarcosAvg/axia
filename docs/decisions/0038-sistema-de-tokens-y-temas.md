# 0038 — Sistema de diseño, tokens y temas

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

La interfaz de Axia creció centrada en la funcionalidad, con un solo tema neutro: `--primary`
casi negro y una paleta de gráficos en escala de grises (las series de los indicadores no se
distinguían). El modo oscuro existía en los tokens pero no había forma de activarlo. Se necesita
un sistema visual moderno, con un acento de marca y capacidad de tematizar, para el rediseño de
interfaz (Fase 8).

## Decisión

Adoptar un **sistema de tokens por tema** sobre las variables CSS de shadcn/ui:

- Los tokens viven en `apps/web/src/styles/themes.css` (separados de `index.css`, que queda como
  entrada de Tailwind).
- El tema se aplica en `<html>` con `data-theme="<nombre>"` y el modo con la clase `.dark`.
- Temas desarrollados: `ocean` (azul, **predeterminado**), `neutral` (base gris),
  `emerald`, `violet` y `contrast` (alto contraste para campo). Cada uno con claro y oscuro.
- Se añade una **paleta de gráficos distinguible** (`--chart-1..5`) y tokens semánticos
  (`--success`, `--warning`, `--info`) reutilizables por insignias y estados.
- La lógica pura vive en `lib/theme.ts` (resolución de tema/modo, aplicación al DOM,
  preferencias). El proveedor y el selector viven en `components/shared` (`theme-provider.tsx`,
  `theme-toggle.tsx`) para respetar las fronteras de dependencia (sección 4 de convenciones).
- La preferencia se guarda en `localStorage` y un script en línea en `index.html` la aplica antes
  del primer pintado para evitar el parpadeo.

## Alternativas consideradas

- **Un solo acento fijo:** menos trabajo, pero no responde a la petición de temas intercambiables.
- **Librerías de theming externas:** innecesarias; las variables CSS de shadcn/ui ya resuelven el
  caso y no se añaden dependencias.
- **Múltiples hojas por tema:** más archivos y carga condicional; se prefiere un único archivo con
  bloques por `data-theme`.

## Consecuencias

- La interfaz tiene acento de marca, temas seleccionables y modo claro/oscuro/sistema.
- Los indicadores de Recharts distinguen sus series por color en todos los temas.
- Cada tema nuevo es un bloque de tokens; el costo de añadir uno es bajo.
- `index.html` incorpora un script mínimo en línea (sin dependencias) que toca `localStorage`.
- El modo oscuro pasa a ser una función real y verificable.
