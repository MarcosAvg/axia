# 0001 — Vite + React como SPA con React Compiler

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Axia es una PWA de seguimiento de tiquets, pensada para escritorio y móvil, con uso sin conexión
en campo y despliegue autoalojable o en la nube. No necesita SEO ni renderizado en servidor: es
una aplicación interna detrás de autenticación. El equipo busca un arranque simple, compilaciones
rápidas y la menor cantidad de infraestructura posible.

## Decisión

Construir el frontend como una **SPA con Vite + React + TypeScript**, sin meta-framework. Se
activa **React Compiler** (vía `@vitejs/plugin-react` con `reactCompilerPreset()` y
`@rolldown/plugin-babel`) para que la memoización sea automática y no haya que sembrar el código
de `useMemo`/`useCallback`.

## Alternativas consideradas

- **Next.js / Remix:** aportan SSR y rutas de servidor que no se necesitan; añaden un servidor
  Node que complica el autoalojamiento y el modo sin conexión.
- **Create React App:** obsoleto y sin soporte actual.
- **Sin React Compiler:** obligaría a memoización manual, más propensa a errores y ruido.

## Consecuencias

- Build simple y rápido; el despliegue es estático (un servidor de archivos lo sirve).
- No hay SSR: la primera pintura depende del cliente, aceptable para una app interna.
- React Compiler debe seguir las reglas de React; `eslint-plugin-react-hooks`
  (`recommended-latest`) las hace cumplir.
- Revertir es barato: quitar el preset del compilador del `vite.config.ts`. Cambiar de bundler
  sería costoso, pero el código es React estándar.
