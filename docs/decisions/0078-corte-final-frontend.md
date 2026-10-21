# 0078 — Corte final del frontend y retirada del stack anterior

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

La web seguía usando el cliente del stack anterior mientras el servidor nuevo ya cubría
autenticación, tiquets, catálogos, evidencias, SSE, métricas y administración. No hay datos reales
que migrar.

## Decisión

1. **Un solo corte controlado:** la web pasa a `features/*/api` contra `/api`, con cookie de sesión
   opaca; no hay doble escritura ni dos fuentes de verdad.
2. **Se retira el stack anterior** (cliente, migraciones, semillas, pruebas, scripts y
   dependencias) en el mismo tramo. Antes de borrar se deja una etiqueta local de seguridad.
3. **Las importaciones externas quedan deshabilitadas** en esta versión. Eran opcionales y no hay
   datos reales que importar; el núcleo funciona sin ellas.
4. **La instalación y los respaldos** siguen el documento
   `docs/start/instalacion.md`. El despliegue real lo ejecuta la persona.
5. **Sin datos reales** no se ejecuta migración de datos ni se toca la nube. La instalación nace
   limpia con la referencia y, opcionalmente, la demo.

## Consecuencias

- Un único servidor y una única base son la fuente de verdad.
- La compuerta `pnpm check` ya no depende de un servicio externo: usa PostgreSQL real y Playwright
  contra el servidor nuevo.
- Las integraciones se podrán añadir después como adaptadores aislados, sin reabrir el núcleo.

## Alternativas descartadas

- **Mantener ambos stacks en paralelo:** duplica escrituras y estados sin datos reales que lo
  justifiquen.
- **Corte por fases de lectura/escritura:** alarga la ventana y añade complejidad.
- **Migrar datos inexistentes:** riesgo sin beneficio.
