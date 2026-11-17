# Buscador de problemas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para ejecutar este plan en la sesión actual.

**Goal:** Seleccionar problemas de todo el catálogo mediante coincidencias aproximadas durante el alta.

**Architecture:** Extender la lectura existente de problemas con su clasificación completa.
Usar una consulta cacheada separada para las sugerencias, una función pura para ordenarlas
y el formulario actual para seleccionar explícitamente los tres identificadores.

**Tech Stack:** Fastify, Drizzle, React, React Hook Form, TanStack Query, Vitest y Playwright.

**Spec:** [Diseño aprobado](../specs/2026-11-17-ticket-problem-search-design.md).

## Global Constraints

- Todo el catálogo disponible para registro; mismos permisos de lectura.
- Sin dependencias nuevas, cambios del esquema ni servicios externos.
- Conservar selectores manuales, adjuntos y reglas actuales del registro.
- Textos es-MX centralizados; teclado, foco y objetivos de 44 px.

## Review Focus

- Padres inactivos: no sugerir problemas que no pueden registrarse.
- Nombres repetidos: distinguir por categoría y subcategoría.
- Consultas lentas: mantener la selección al llegar las opciones dependientes.
- Cambios manuales de clasificación: limpiar hijos incompatibles.
- Búsquedas vacías o sin resultados: no cambiar el formulario ni enviar por Enter.

### Task 1: Lectura del catálogo completo

**Files:** `apps/server/src/catalogs/{repository,routes}.ts`,
`apps/server/test/db/catalogs-http.test.ts`,
`apps/web/src/features/catalogs/{domain/types,api/catalogs-api,hooks/use-catalogs,index}.ts`.

**Interfaces:** `ProblemSearchOption extends ProblemOption` añade `categoryId`,
`categoryName` y `subcategoryName`; `useProblemSearchCatalog()` consulta
`GET /api/catalogs/problems` sin filtro. Los selectores conservan las consultas filtradas.

- [x] Añadir pruebas de catálogo global con ambas categorías, adjuntos y clasificación;
      prohibición sin permiso/sesión y exclusión de problemas o padres inactivos.
- [x] Ejecutar integración y observar el fallo por filtro obligatorio.
- [x] Hacer opcional el filtro de problemas y devolver su clasificación con joins;
      añadir DTO, cliente y hook públicos con clave independiente.
- [x] Ejecutar integración afectada hasta verde y guardar un commit.

### Task 2: Búsqueda y selección accesible

**Files:** nuevos `apps/web/src/features/tickets/domain/problem-search{,.test}.ts`
y `components/ticket-problem-search.tsx`, `hooks/use-problem-search.ts` y
`components/ticket-classification-fields.test.tsx`; modificar clasificación, captura,
formulario y diccionario del feature.

**Interfaces:** `searchProblems<T extends { name: string }>(items: T[], query: string): T[]`
devuelve hasta 10 sugerencias; el componente recibe problemas, carga/error/reintento
y `onSelect(problem: ProblemSearchOption)`. La clasificación recibe el formulario.

- [x] Probar normalización, fragmentos, palabras en distinto orden, transposición,
      sustitución, ruido, consultas vacías y prioridad de coincidencias exactas.
- [x] Ejecutar Vitest y observar el fallo antes de implementar la función pura.
- [x] Implementar normalización y distancia de edición acotada por palabra (un error
      desde cuatro letras, dos desde ocho; las letras transpuestas cuentan como uno).
- [x] Probar selección por teclado y clic, nombres repetidos, carga/error/reintento,
      ausencia de mutaciones al escribir y selección con opciones retrasadas.
- [x] Implementar sugerencias como lista de botones accesibles; Enter en el campo
      elige la primera sugerencia, flechas mueven el foco y Escape oculta resultados.
      Completar los tres campos, marcar cambios y validar; controlar selectores para
      conservar valores y usar la clasificación del resultado mientras llegan opciones.
- [x] Ejecutar Vitest afectado hasta verde y guardar un commit.

### Task 3: Flujo y cierre

**Files:** `apps/web/e2e/tickets.spec.ts`, `docs/reference/api.md`,
`CHANGELOG.md` y diseño aprobado.

**Interfaces:** flujo actual de registro y nueva lectura global.

- [x] Añadir flujo smoke que busque con error tipográfico, seleccione y registre;
      comprobar categoría, subcategoría, problema y cambio posterior manual.
- [x] Actualizar API, changelog y estado del diseño sin incluir cambios ajenos.
- [x] Ejecutar `pnpm check:fast`, `pnpm test:affected`, integración afectada y
      `pnpm test:e2e:smoke`; revisar la rama y guardar el commit de cierre.
- [x] Ejecutar `pnpm check` antes de cualquier integración a `main`.

## Resultado de ejecución

- `pnpm check:fast`: lint y tipos verdes; 68 pruebas de servidor y 580 de web.
- `pnpm test:e2e:smoke`: 24 flujos aprobados, incluido el registro con búsqueda aproximada.
- `pnpm test:affected` activó la compuerta completa. La primera ejecución falló en
  `ui-quality.spec.ts` («el título de la pestaña cambia por ruta») durante el login,
  con el campo Usuario vacío. Pasó al repetirse aislada sin modificar la prueba.
- `pnpm check` final: aprobado; 79 E2E, 557 pruebas PostgreSQL, React Compiler,
  chequeos estáticos y build. No se debilitaron pruebas ni reglas.
- Revisión independiente: corregido el respaldo de categoría cuando su consulta tarda,
  con regresión que se observó fallar antes de la corrección.
- Vista de escritorio y móvil de 390 px inspeccionada, sin desbordamiento horizontal.
- Se conserva la rama `feat/ticket-problem-search`; no se integra a `main` ni se publica.
