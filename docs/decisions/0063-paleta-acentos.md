# 0063 — Paleta de acentos de color

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

La interfaz usaba sobre todo superficies neutras (`background`, `card`, `muted`, `border`) y el
`primary` del tema; el único color con variación real estaba en las **gráficas** (`chart-1..5`) y en
las insignias de estado. El resultado se percibía **monocromático**.

## Decisión

- **Paleta fija multi-tono** (`styles/accents.css`): seis tonos (`tone-1..6` = azul, teal, violeta,
  ámbar, rosa, verde) definidos en claro y oscuro, **iguales en todos los temas** (no dependen del
  tema). Se exponen a Tailwind como `tone-1..6` (`bg-tone-3`, `text-tone-3`, `bg-tone-3/10`, …).
- **Acentos sutiles**: fondo con tinte `/10` + texto/ícono del color, o un **punto** de color.
- **Utilidades puras** (`lib/tones.ts`): mapas de clases y helpers deterministas `toneForIndex`,
  `toneForId` (estable por texto/id) y `toneForPriority` (por nivel: 1=Urgente … 4=Baja).
- **Color por dimensión**: prioridad por nivel; categoría/equipo/edificio por `toneForId`.
- **Aplicación**: tarjetas KPI (Panel y Métricas), encabezados de sección (`BandejaSection`,
  `FormSection`, las `Section` del detalle), insignia de prioridad, puntos en lista/detalle y grupos
  del sidebar.
- El `primary` del tema sigue mandando en botones/enlaces; los tonos son **acentos**.

## Alternativas consideradas

- **Nuevos temas**: más trabajo y no era lo pedido; se buscaba variación dentro del diseño actual.
- **Acentos derivados del tema**: poca variación (todo gira al mismo matiz).
- **Color marcado (fondos sólidos)**: ruido visual; se eligió intensidad sutil.

## Consecuencias

- La interfaz gana color sin perder sobriedad ni contraste (tonos AA en claro/oscuro).
- `PriorityBadge` y los puntos de color usan `toneForId`/`toneForPriority`, así que categorías y
  equipos tienen color estable.
- Cambian los colores de varias vistas: la **regresión visual** (opt-in) se regenera.
- Se agrega `priorityPosition` a la lista/detalle de tiquets (para el color por nivel).
