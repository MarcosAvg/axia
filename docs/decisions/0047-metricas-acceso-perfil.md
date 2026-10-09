# 0047 — Métricas, acceso y perfil

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

El tablero de métricas mostraba 14 tarjetas KPI de igual peso, con filtros que se perdían al
desplazarse y tablas con estilos propios. El acceso era una tarjeta centrada que desaprovechaba
el escritorio, y el perfil, una sola tarjeta.

## Decisión

- **Métricas**:
  - KPI **agrupados por área**: Carga · Tiempos · Calidad · SLA y satisfacción.
  - **Filtros sticky** (rango de fechas y dimensiones) con "Limpiar".
  - **Tablas con `DataTable`** y `EmptyState` en dimensión, SLA por prioridad, duplicados y
    antigüedad.
  - Gráficas y estados vacíos unificados en `ChartCard`.
- **Acceso**: composición de **dos columnas en escritorio** (panel de marca + formulario) y
  centrado en móvil.
- **Perfil**: por **secciones** (Datos de la cuenta · Cuenta) mostrando **roles** y **zona
  horaria**.

## Alternativas consideradas

- **Mantener 14 tarjetas**: sin jerarquía; difícil de escanear.
- **Perfil de una sola tarjeta**: no muestra roles ni zona horaria.

## Consecuencias

- El tablero jerarquiza los indicadores y conserva los filtros a la vista.
- Acceso y perfil aprovechan el escritorio y muestran la identidad del usuario.
- La regresión visual con capturas de Playwright queda como mejora opcional (documentada en
  `docs/ESTADO.md`), para no introducir fragilidad en la compuerta.
