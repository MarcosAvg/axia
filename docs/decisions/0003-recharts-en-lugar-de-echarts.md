# 0003 — Recharts en lugar de ECharts

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Las métricas se muestran con gráficas dentro de una interfaz basada en Tailwind y shadcn/ui. Se
necesitan barras, líneas, áreas, barras apiladas y pastel, integradas con el sistema de diseño y
con la menor carga posible.

## Decisión

Usar **Recharts** a través del componente `chart` de shadcn/ui. Es la opción que shadcn/ui integra
de forma nativa con Tailwind y los tokens del tema.

## Alternativas consideradas

- **ECharts:** muy potente, pero más pesado y ajeno al sistema de componentes de shadcn/ui;
  requiere envoltorios propios.
- **Chart.js:** viable, pero sin componente oficial de shadcn/ui.
- **visx:** muy flexible, con más trabajo de composición.

## Consecuencias

- Las gráficas comparten estilo y tema con el resto de la interfaz.
- Recharts cubre las gráficas previstas (por edificio, categoría, tipo, tendencia, pausas).
- Si una visualización muy avanzada no es posible con Recharts, se reevalúa en un ADR nuevo.
- Revertir es acotado: las gráficas se aíslan en componentes bajo `components/`.
