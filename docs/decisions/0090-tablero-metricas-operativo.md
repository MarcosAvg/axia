# 0090 — Tablero de métricas operativo, con escritorio primero

- Fecha: 2026-10-28
- Estado: aceptada

## Contexto

El tablero de métricas se usa sobre todo desde escritorio, pero su diseño había quedado
centrado en móvil: cinco pestañas que mostraban una sección a la vez, un segundo nivel de
pestañas para las dimensiones, controles de 44 px y tarjetas de una sola columna. A 1280 px
eso dejaba gráficas de 936 px de ancho por 224 px de alto, secciones enteras ocultas y una
página que se leía como un teléfono estirado.

La verificación visual mostró además que entre 1024 y 1279 px todo colapsaba a una columna,
porque los cortes de Tiempos y Duplicados estaban en `xl`.

## Decisión

- **Escritorio primero a partir de 1024 px.** Las secciones del tablero se apilan en una sola
  página con una barra de anclas pegajosa bajo la barra superior. Por debajo de 1024 px se
  conservan las pestañas, que siguen siendo la navegación correcta en móvil.
- **Una sola rama montada.** `useMediaQuery` elige entre la página con anclas y las pestañas;
  no se duplican paneles ni gráficas.
- **Dimensiones con selector.** Las cinco pestañas anidadas de dimensiones se sustituyen por un
  selector «Ver por»; es un filtro, no una segunda navegación.
- **Densidad de escritorio.** Rejillas de 4–5 columnas para los KPI, controles de 36 px en
  escritorio (44 px en móvil), menos relleno y gráficas emparejadas en dos columnas, con alto
  mayor solo en escritorio.
- **Sin scroll-spy.** La barra de anclas no resalta la sección activa: el estado no cambia el
  resultado y añade JavaScript y pruebas.

## Consecuencias

- A 1280 px se ven las cinco secciones con sus gráficas emparejadas y sin desbordes
  horizontales entre 1024 y 1920 px.
- El equipo de pruebas cambia: el E2E de escritorio usa el enlace «Tiempos» y el selector
  «Ver por»; se añade una prueba de pestañas en móvil. Las capturas de regresión pasan a una
  página completa en escritorio y una captura móvil.
- El móvil sigue siendo usable, pero no guía las decisiones de composición.
