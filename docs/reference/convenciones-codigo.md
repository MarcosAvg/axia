# Convenciones de código

## Objeto

Documento de cumplimiento obligatorio para el código de Axia. Como no hay revisión humana del
código, **lo que se pueda verificar con una herramienta se verifica con una herramienta** (sección
14); lo demás se cumple por disciplina y se comprueba en la definición de terminado (sección 15).

## Contenido

1. [Principios](#1-principios)
2. [Idioma y nombres](#2-idioma-y-nombres)
3. [Estructura del frontend (por funcionalidad)](#3-estructura-del-frontend-por-funcionalidad)
4. [Reglas de dependencia](#4-reglas-de-dependencia-se-verifican-con-herramienta)
5. [Límites de tamaño y complejidad](#5-límites-de-tamaño-y-complejidad)
6. [TypeScript](#6-typescript)
7. [React](#7-react)
8. [Acceso a datos desde el cliente](#8-acceso-a-datos-desde-el-cliente)
9. [Offline y evidencias](#9-offline-y-evidencias)
10. [Base de datos (SQL)](#10-base-de-datos-sql)
11. [Servidor y procesos](#11-servidor-y-procesos)
12. [Errores, registro y seguridad](#12-errores-registro-y-seguridad)
13. [Pruebas](#13-pruebas)
14. [Herramientas que hacen cumplir estas reglas](#14-herramientas-que-hacen-cumplir-estas-reglas)
15. [Definición de terminado](#15-definición-de-terminado-toda-tarea)
16. [Documentación](#16-documentación)
17. [Git](#17-git)
18. [Dependencias](#18-dependencias)
19. [Anti-patrones prohibidos](#19-anti-patrones-prohibidos)

## 1. Principios

1. **Simple antes que ingenioso.** Se elige la solución más sencilla que cumpla el requisito.
2. **Pequeño y con un solo propósito**: archivos, funciones y componentes hacen una cosa.
3. **Las reglas de negocio viven en la base de datos y en funciones puras**, no en componentes.
4. **Todo lo importante se prueba.** Las reglas de seguridad y de transición, primero.
5. **No abstraer antes de tiempo.** Se extrae algo común cuando se repite por tercera vez.
6. **Legible sobre corto.** El código se lee muchas más veces de las que se escribe.
7. **Nada de sorpresas**: sin efectos ocultos, sin estado global implícito, sin valores mágicos.
8. **Núcleo independiente.** Axia no se ancla a ninguna plataforma externa (sección 4).

## 2. Idioma y nombres

- **Código, tablas, columnas, valores de enum, rutas de API y nombres de archivo: inglés.**
- **Textos que ve el usuario (etiquetas, mensajes, errores): español (es-MX)**, centralizados
  en un diccionario (`features/*/i18n` o `lib/i18n`), nunca incrustados en la lógica.
- **Documentación y mensajes de commit: español.**
- Nombres completos y descriptivos; sin abreviaturas ni nombres de una letra (salvo índices
  de bucles triviales).
- Booleanos con prefijo `is`, `has`, `can`, `should` (`isBlocked`, `canReassign`).
- Funciones con verbo (`calculateTotalInterval`), tipos y componentes en `PascalCase`,
  variables y funciones en `camelCase`, constantes en `UPPER_SNAKE_CASE`.
- Archivos en `kebab-case` (`ticket-list.tsx`); hooks en `use-...`.
- Para términos del negocio se usa el glosario de `docs/concepts/dominio.md`; no se inventan sinónimos.

## 3. Estructura del frontend (por funcionalidad)

```
apps/web/src/
├── app/                 → providers, configuración global, router
├── routes/              → SOLO definición de rutas y composición de páginas (sin lógica)
├── features/
│   ├── <feature>/       → tickets, assignments, blockers, evidence, catalogs,
│   │   │                  metrics, auth, admin
│   │   ├── api/         → queries y mutaciones (TanStack Query + HTTP)
│   │   ├── components/  → interfaz propia del feature
│   │   ├── hooks/       → lógica de pantalla
│   │   ├── domain/      → funciones puras de negocio (cálculos, mapeos, reglas)
│   │   ├── i18n.ts      → textos en español del feature
│   │   ├── schemas.ts   → validación con Zod
│   │   └── index.ts     → único punto de entrada público del feature
├── components/
│   ├── ui/              → shadcn/ui (no editar salvo necesidad justificada)
│   └── shared/          → componentes genéricos reutilizables
└── lib/                 → cliente HTTP, offline (Dexie), formateadores, utilidades
```

En el servidor: `apps/server/src/<dominio>/` para rutas y servicios, `apps/server/db/migrations/`
para SQL. Los adaptadores externos, si se añaden, viven aislados y no modifican el núcleo.

## 4. Reglas de dependencia (se verifican con herramienta)

- `routes/` puede importar de `features/*` (vía su `index.ts`) y de `components/`.
- `features/A` **no importa** archivos internos de `features/B`; solo `features/B/index.ts`.
- `components/` y `lib/` **no importan** de `features/` ni de `routes/`.
- **Solo `features/*/api` y `lib/` pueden usar el cliente HTTP.** Ningún componente, hook de
  interfaz ni ruta llama a `/api` directamente.
- `domain/` no importa React, TanStack, cliente HTTP ni Dexie: es TypeScript puro.
- Sin dependencias circulares.
- **Independencia del núcleo:**
  - **Los nombres de plataformas de terceros solo pueden aparecer** en
    `docs/history/integraciones-y-migracion.md`, `docs/internal/estado.md`,
    `docs/decisions/**` y `scripts/**`. Esto incluye identificadores, textos, comentarios, enums,
    columnas, valores de semillas y pruebas del núcleo. Lo verifica `pnpm check:agnostic`.
  - El núcleo trata los sistemas externos solo como datos genéricos: `system` en
    `ticket_external_refs`, `source` en eventos, `channel` en tiquets.

## 5. Límites de tamaño y complejidad

| Elemento | Límite |
|---|---|
| Archivo | 300 líneas (sin comentarios ni líneas vacías) |
| Función | 60 líneas (advertencia a 50) |
| Componente React | 150 líneas; si crece, se divide |
| Parámetros | 4; con más, recibe un objeto |
| Anidación | 3 niveles |
| Complejidad ciclomática | 10 |

Si un límite estorba, **se divide el código, no se sube el límite**. Un `eslint-disable` de
estas reglas requiere un comentario con la razón y se evita.

## 6. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noFallthroughCasesInSwitch: true`.
- **Prohibido `any`**, `@ts-ignore` y `as` para forzar tipos. Si no hay alternativa, se usa
  `@ts-expect-error` con una explicación.
- Los tipos del esquema viven en `apps/server/src/db/schema.ts` (Drizzle). La API define sus
  contratos con Zod; la web no genera tipos desde la base.
- **Validación en las fronteras con Zod**: formularios, datos importados, respuestas externas y
  entradas del servidor. Dentro del sistema se confía en los tipos.
- Estados, roles y tipos como uniones literales en el feature o el servidor.
- Se prefiere `type` para uniones e `interface` para formas de objetos públicos.
- Sin exportaciones por defecto, excepto donde el framework lo exija.

## 7. React

- **Datos del servidor en TanStack Query**, no en `useState` + `useEffect`.
  Claves de consulta centralizadas por feature (`ticketKeys.list(filters)`).
- **Filtros, orden y paginación de listas viven en la URL** (parámetros de búsqueda del
  router) para poder recargar y compartir.
- El componente presenta; la lógica va en un hook o en `domain/`.
- Estado local lo más cerca posible de donde se usa; se evita el estado global salvo sesión y
  preferencias.
- Nada de `useEffect` para derivar datos: se calcula durante el render o se usa `useMemo` con
  criterio.
- Listas largas paginadas o virtualizadas; nunca se cargan miles de filas de una vez.
- Cada pantalla maneja los cuatro estados: **cargando, vacío, error y con datos**.
- Formularios con React Hook Form + Zod; mensajes de error en español junto al campo.
- **Accesibilidad**: etiquetas en todos los campos, navegación por teclado, foco visible,
  contraste suficiente y `alt` en imágenes. Es una PWA de uso en campo, con sol y con prisa:
  objetivos táctiles de al menos 44 px.

## 8. Acceso a datos desde el cliente

- Toda llamada HTTP está en `features/*/api/` o `lib/`, con tipos de retorno explícitos.
- Las **mutaciones que cambian el flujo** usan `POST /api/tickets/:id/actions` o
  `POST /api/sync/actions`. No se actualiza el estado directamente.
- Se piden solo los datos necesarios; las listas se paginan y filtran en el servidor.
- Los errores de la API (`ApiError`) se convierten en errores de dominio tipados antes de llegar a
  la interfaz.

## 9. Offline y evidencias

- Toda acción que pueda ocurrir sin conexión se guarda primero en `outbox` (Dexie) con un
  **UUID generado en el cliente** (`crypto.randomUUID()`), que la función en Postgres usa
  como clave de idempotencia (`client_request_id`).
- La sincronización se dispara al abrir la aplicación, al evento `online` y al volver a primer
  plano (`visibilitychange`). **No se depende de Background Sync** (no existe en iOS Safari).
- Las fotos se comprimen antes de guardarse, se guardan como `Blob` en IndexedDB y se suben
  con carga reanudable (TUS). El evento queda marcado como "evidencia pendiente" hasta que
  la subida termine.
- Reintentos con espera creciente y límite; los fallos permanentes se muestran al usuario.
- El service worker nunca se cachea (`Cache-Control: no-cache`); las actualizaciones se
  aplican con confirmación (`registerType: 'prompt'`).

## 10. Base de datos (SQL)

### Nombres

- `snake_case`; tablas en plural (`tickets`, `ticket_events`); claves primarias `id`; claves
  foráneas `<singular>_id`; marcas de tiempo `created_at` y `updated_at` (con disparador).
- Enums en inglés `snake_case`. Funciones con `<entidad>_<verbo>`: `ticket_assign_technician`,
  `blocker_advance_state`.
- Índices: `idx_<tabla>_<columnas>`. Políticas: `<tabla>_<acción>_<rol>`.

### Independencia del esquema

- El esquema del núcleo **no contiene columnas, enums, funciones ni semillas con nombres de
  plataformas externas**.
- Identificadores externos solo en `ticket_external_refs(system, external_id)` y datos crudos de
  importación solo en `import_records.raw`. No se añaden columnas al núcleo para un sistema
  concreto.
- Si una integración necesita estructura propia, va en tablas con prefijo `integration_` y su
  propia migración, sin llaves foráneas desde el núcleo hacia ellas.

### Migraciones

- Una migración, una preocupación. Nombre: `AAAAMMDDHHMMSS_verbo_objeto.sql`.
- Una migración ya integrada a `main` no se edita: se agrega otra.
- Toda migración debe aplicarse limpia con `pnpm db:reset` y dejar las pruebas en verde.
- Se incluye `comment on table` / `comment on column` para todo lo que no sea obvio.
- Datos de referencia en migraciones y demo explícita en `apps/server/src/db/seed-demo/`.

### Seguridad (autorización en el servidor)

- **No hay RLS.** Toda consulta de tiquets pasa por un repositorio con alcance
  (`scopePredicate`).
- Los permisos se evalúan con `can`/`canAct`; un acceso fuera de alcance devuelve 404 opaco.
- **Los roles viven en `users`/`user_roles`**; nunca en metadatos editables por el usuario.
- `ticket_events` es **solo de agregar**: sin permisos de `update`/`delete` y con un disparador
  que lo impida.
- Las acciones validan: permiso, transición permitida, campos obligatorios e idempotencia
  (`client_request_id`), y escriben el evento en la misma transacción.
- Una acción por transición; nada de una función gigante con `case`.

### Rendimiento

- Índices en claves foráneas y en columnas de filtro frecuentes (estado, fechas, edificio).
- Las métricas son **vistas** (o materializadas si el volumen lo pide). Los intervalos y el
  mes **se calculan, no se almacenan**.

## 11. Servidor y procesos

- La API vive en `apps/server/src/<dominio>/` con rutas Fastify, esquemas Zod y servicios.
- Las rutas no contienen lógica de negocio: delegan en servicios y repositorios.
- Las acciones de tiquet se ejecutan en una transacción y escriben el evento en la misma
  transacción. No hay actualizaciones directas de estado desde la web.
- Las integraciones externas, si existen, viven en adaptadores aislados y no modifican el núcleo.
- Los secretos se leen del entorno; nunca llegan al frontend, al repositorio ni a los logs.

## 12. Errores, registro y seguridad

- Nunca un `catch` vacío. Un error se maneja, se transforma en un error de dominio o se
  propaga; el usuario recibe un mensaje claro en español.
- Sin `console.log` en el código integrado (se permiten `console.warn` y `console.error`).
  Se usa un módulo `lib/logger` para centralizar.
- No se registran datos personales, tokens ni claves.
- Entradas siempre validadas; salidas de texto libre siempre escapadas (React lo hace; no se
  usa `dangerouslySetInnerHTML`).
- Variables de entorno: solo `VITE_*` públicas en el cliente; lo secreto nunca llega al
  cliente. `.env.example` se mantiene al día.
- Archivos de evidencia en almacenamiento privado con URL firmadas y límites de tipo y tamaño.

## 13. Pruebas

| Nivel | Qué cubre | Prioridad |
|---|---|---|
| Vitest + PostgreSQL | API, permisos, transacciones, migraciones e invariantes del esquema | **Máxima** |
| Vitest | Funciones de `domain/`, esquemas Zod, hooks con lógica | Alta |
| Playwright | Flujos críticos, incluido el del técnico sin conexión | Pocos y bien elegidos |

- Toda función `domain/` nueva lleva pruebas. Toda ruta y tabla nueva lleva pruebas positivas y
  negativas de permiso y alcance. Toda acción, pruebas de caso válido, rol incorrecto, transición
  inválida y repetición idempotente.
- Las pruebas son deterministas: sin dependencia de hora real (se inyecta el reloj), de orden
  ni de red externa.
- Nombres de prueba descriptivos en español: `rechaza la transición si el rol no es supervisor`.
- **Ninguna prueba se debilita, se omite ni se borra para que pase.** Un error corregido se
  acompaña de una prueba que lo reproduce.
- El núcleo debe tener sus pruebas completas **sin cargar ningún adaptador de integración**.

## 14. Herramientas que hacen cumplir estas reglas

Se configuran en el arranque; el CI y `pnpm check` las ejecutan.

- **TypeScript**: banderas de la sección 6.
- **ESLint** (`typescript-eslint`, `react-hooks`, `jsx-a11y`) con:

```js
rules: {
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
  complexity: ['error', 10],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  'no-console': ['error', { allow: ['warn', 'error'] }],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
}
```

- **Fronteras entre capas** con `dependency-cruiser`, que hagan fallar el build al violar la
  sección 4 (uso del cliente HTTP solo desde `features/*/api` y `lib/`, dominio puro y ausencia de
  ciclos).
- **`pnpm check:agnostic`** (por ejemplo `scripts/check-agnostic.mjs`): busca una lista
  configurable de nombres de plataformas de terceros (mayúsculas y minúsculas) en todo el
  repositorio y falla si aparecen fuera de las rutas permitidas de la sección 4. La lista vive
  en un archivo de configuración dentro de `scripts/`, que es la única excepción.
- **Prettier** para formato; **knip** para código y dependencias sin uso.
- **Husky + lint-staged** (formato y lint al confirmar) y **commitlint** (Conventional Commits).
- **`pnpm db:test`** aplica las migraciones contra PostgreSQL real y verifica el esquema.
- **CI** (GitHub Actions o Forgejo) ejecutando la compuerta completa en pull requests y en
  `main`. El ciclo local usa `pnpm check:fast` y `pnpm test:affected`; la compuerta completa no
  se repite tras cada edición.

## 15. Definición de terminado (toda tarea)

- [ ] `pnpm check` completo en verde antes de integrar (lint, tipos, independencia, Vitest,
      Playwright, PostgreSQL y build), con la salida mostrada. Durante el desarrollo basta
      `pnpm check:fast` + `pnpm test:affected`.
- [ ] Pruebas nuevas o actualizadas para el comportamiento cambiado.
- [ ] Si hubo migración: `pnpm db:reset` limpio y `pnpm db:test` en verde.
- [ ] Documentación actualizada en el mismo commit (incluido `docs/concepts/dominio.md` si cambió el negocio).
- [ ] Sin `console.log`, sin código comentado, sin `TODO` sin registrar en `docs/internal/estado.md`.
- [ ] Sin secretos, `.env.example` al día.
- [ ] El núcleo no depende de ninguna plataforma externa.
- [ ] `docs/internal/estado.md` actualizado y, si aplica, un ADR creado.

## 16. Documentación

| Documento | Contenido |
|---|---|
| `README.md` | Puesta en marcha, comandos y estructura del repositorio |
| `AGENTS.md` | Reglas cortas para el agente |
| `docs/README.md` | Índice de la documentación |
| `docs/internal/estado.md` | Estado, hoja de ruta y bloqueos |
| `docs/concepts/dominio.md` | Flujo, modelo conceptual y glosario del núcleo |
| `docs/history/integraciones-y-migracion.md` | Referencia histórica de importación |
| `docs/reference/estilo-documentacion.md` | Normas de redacción de la documentación |
| `docs/reference/convenciones-codigo.md` | Este documento |
| `docs/decisions/NNNN-titulo.md` | Una decisión de arquitectura por archivo |

- **TSDoc** solo en funciones públicas de `lib/` y en el `index.ts` de cada feature: qué hace,
  parámetros y errores. No se comenta lo evidente.
- **Los comentarios en el código explican el porqué**, nunca el qué. Si hace falta explicar qué
  hace, se renombra o se reestructura.
- **Comentarios SQL** con `comment on` en tablas, columnas y funciones.
- **Plantilla de ADR** (`docs/decisions/0001-titulo.md`):

```markdown
# 0001 — Título de la decisión
- Fecha: AAAA-MM-DD
- Estado: aceptada | sustituida por 000X
## Contexto
Qué problema o restricción había.
## Decisión
Qué se decidió.
## Alternativas consideradas
Y por qué se descartaron.
## Consecuencias
Qué se gana, qué se paga y cómo revertirlo.
```

- Decisiones que ya merecen ADR desde el arranque: Vite + React como SPA, PostgreSQL + Drizzle +
  Fastify, Recharts en lugar de ECharts, cola offline con Dexie, modelo de bloqueos dirigido por
  datos e independencia del núcleo respecto a plataformas externas.
- **Regla clave:** un cambio que altera el comportamiento actualiza su documentación en el
  mismo commit.

## 17. Git

- Ramas cortas: `feat/...`, `fix/...`, `refactor/...`, `docs/...`, `chore/...`. Se integra a
  `main` solo con `pnpm check` completo en verde.
- **Conventional Commits** en español: `feat(tickets): agrega asignación a técnico`.
  Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.
- Un commit, una idea; cada commit deja el proyecto compilando y con pruebas en verde.
- No se suben `.env`, claves, volcados de datos reales ni archivos generados por el build.
- Datos reales de cualquier fuente nunca se suben al repositorio; se usan datos ficticios en las
  pruebas y las semillas.

## 18. Dependencias

- Antes de añadir una dependencia se comprueba si se resuelve con lo existente o con pocas
  líneas propias. En caso contrario, se verifica en el registro que existe, es la oficial, está
  mantenida y su licencia es MIT, Apache-2.0, BSD o ISC.
- Versiones fijadas por el archivo de bloqueo (`pnpm-lock.yaml`), que siempre se confirma.
- Cada dependencia nueva se justifica en el mensaje del commit. `knip` detecta las que sobran.
- No se añaden SDK ni clientes de plataformas de terceros al núcleo; si una integración los
  necesita, viven solo en su adaptador.

## 19. Anti-patrones prohibidos

- Componentes con llamadas directas a `/api`.
- `update` directo al estatus del tiquet fuera de una acción del servidor.
- Lógica de negocio dentro de componentes o rutas.
- Archivos "utils" o "helpers" genéricos que crecen sin límite: se nombran por propósito.
- Estado del servidor copiado a `useState`.
- Valores mágicos (cadenas de estado, roles, IDs) repetidos en varios archivos.
- `any`, `@ts-ignore`, `eslint-disable` sin razón escrita.
- Consultas de tiquets fuera de un repositorio con alcance; acciones sin transacción e idempotencia.
- Modificar migraciones ya integradas.
- Nombres, campos, estados o reglas de otra plataforma dentro del núcleo; hacer que el núcleo
  espere o dependa de un sistema externo.
- Tocar producción, infraestructura real o credenciales sin confirmación de la persona.
- Hacer pasar una prueba modificándola en lugar de corregir el código.
