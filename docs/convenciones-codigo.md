# Axia — Convenciones de código

Este documento es de cumplimiento obligatorio. Como no hay revisión humana del código, **lo que
se pueda verificar con una herramienta se verifica con una herramienta** (sección 14). Lo que
no, se cumple por disciplina y se comprueba en la definición de terminado (sección 15).

## 1. Principios

1. **Simple antes que ingenioso.** Elige la solución más sencilla que cumpla el requisito.
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
- Para términos del negocio usa el glosario de `docs/dominio.md`. No inventes sinónimos.

## 3. Estructura del frontend (por funcionalidad)

```
apps/web/src/
├── app/                 → providers, configuración global, router
├── routes/              → SOLO definición de rutas y composición de páginas (sin lógica)
├── features/
│   ├── <feature>/       → tickets, assignments, blockers, evidence, catalogs,
│   │   │                  metrics, auth, admin
│   │   ├── api/         → queries y mutaciones (TanStack Query + Supabase)
│   │   ├── components/  → interfaz propia del feature
│   │   ├── hooks/       → lógica de pantalla
│   │   ├── domain/      → funciones puras de negocio (cálculos, mapeos, reglas)
│   │   ├── i18n.ts      → textos en español del feature
│   │   ├── schemas.ts   → validación con Zod
│   │   └── index.ts     → único punto de entrada público del feature
│   └── integrations/    → ADAPTADORES de sistemas externos (aislados del núcleo)
│       └── <adapter>/   → un directorio por fuente; misma forma que un feature
├── components/
│   ├── ui/              → shadcn/ui (no editar salvo necesidad justificada)
│   └── shared/          → componentes genéricos reutilizables
└── lib/                 → cliente Supabase, offline (Dexie), formateadores, utilidades
```

En el servidor: `supabase/functions/integration-<nombre>/` para procesos de integración; el
resto de funciones no llevan el prefijo `integration-`.

## 4. Reglas de dependencia (se verifican con herramienta)

- `routes/` puede importar de `features/*` (vía su `index.ts`) y de `components/`.
- `features/A` **no importa** archivos internos de `features/B`; solo `features/B/index.ts`.
- `components/` y `lib/` **no importan** de `features/` ni de `routes/`.
- **Solo `features/*/api` y `lib/` pueden importar el cliente de Supabase.** Ningún
  componente, hook de interfaz ni ruta lo hace directamente.
- `domain/` no importa React, TanStack, Supabase ni Dexie: es TypeScript puro.
- Sin dependencias circulares.
- **Independencia del núcleo:**
  - Ningún módulo fuera de `features/integrations/` importa de `features/integrations/`.
  - Los adaptadores pueden usar la API pública (`index.ts`) de los features del núcleo, nunca
    sus archivos internos.
  - **Los nombres de plataformas de terceros solo pueden aparecer** en
    `apps/web/src/features/integrations/**`, `supabase/functions/integration-*/**`,
    `docs/integraciones-y-migracion.md`, `docs/ESTADO.md` y `docs/decisions/**`.
    Esto incluye identificadores, textos, comentarios, enums, columnas, valores de semillas y
    pruebas del núcleo. Lo verifica `pnpm check:agnostic`.
  - El núcleo trata los sistemas externos solo como datos genéricos: `system` en
    `ticket_external_refs`, `source` en eventos, `channel` en tiquets.

## 5. Límites de tamaño y complejidad

| Elemento | Límite |
|---|---|
| Archivo | 300 líneas (sin comentarios ni líneas vacías) |
| Función | 60 líneas (advertencia a 50) |
| Componente React | 150 líneas; si crece, divídelo |
| Parámetros | 4; con más, recibe un objeto |
| Anidación | 3 niveles |
| Complejidad ciclomática | 10 |

Si un límite estorba, **se divide el código, no se sube el límite**. Un `eslint-disable` de
estas reglas requiere un comentario con la razón y se evita.

## 6. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noFallthroughCasesInSwitch: true`.
- **Prohibido `any`**, `@ts-ignore` y `as` para forzar tipos. Si no hay alternativa, usa
  `@ts-expect-error` con una explicación.
- Los tipos de la base de datos vienen de `pnpm db:types`; no los escribas a mano. Deriva
  tipos de interfaz a partir de ellos.
- **Valida en las fronteras con Zod**: formularios, datos importados, respuestas externas,
  entradas de Edge Functions. Dentro del sistema, confía en los tipos.
- Estados, roles y tipos como uniones literales o enums compartidos en `packages/shared`.
- Prefiere `type` para uniones y `interface` para formas de objetos públicos.
- Sin exportaciones por defecto, excepto donde el framework lo exija.

## 7. React

- **Datos del servidor en TanStack Query**, no en `useState` + `useEffect`.
  Claves de consulta centralizadas por feature (`ticketKeys.list(filters)`).
- **Filtros, orden y paginación de listas viven en la URL** (parámetros de búsqueda del
  router) para poder recargar y compartir.
- El componente presenta; la lógica va en un hook o en `domain/`.
- Estado local lo más cerca posible de donde se usa; evita estado global salvo sesión y
  preferencias.
- Nada de `useEffect` para derivar datos: calcula durante el render o usa `useMemo` con
  criterio.
- Listas largas paginadas o virtualizadas; nunca cargues miles de filas de una vez.
- Cada pantalla maneja los cuatro estados: **cargando, vacío, error y con datos**.
- Formularios con React Hook Form + Zod; mensajes de error en español junto al campo.
- **Accesibilidad**: etiquetas en todos los campos, navegación por teclado, foco visible,
  contraste suficiente, `alt` en imágenes. Es una PWA de uso en campo, con sol y con prisa:
  objetivos táctiles de al menos 44 px.

## 8. Acceso a datos desde el cliente

- Toda llamada a Supabase está en `features/*/api/` o `lib/`, con tipos de retorno explícitos.
- Las **mutaciones que cambian el flujo** (asignar, iniciar, pausar, resolver, etc.) usan
  **solo RPC**. Prohibido `update` directo a `tickets.status`.
- Selecciona solo las columnas necesarias; no uses `select('*')` en listas.
- Las consultas se paginan y filtran en el servidor.
- Los errores de Supabase se convierten en errores de dominio tipados antes de llegar a la
  interfaz.

## 9. Offline y evidencias

- Toda acción que pueda ocurrir sin conexión se guarda primero en `outbox` (Dexie) con un
  **UUID generado en el cliente** (`crypto.randomUUID()`), que la función en Postgres usa
  como clave de idempotencia (`client_request_id`).
- La sincronización se dispara al abrir la app, al evento `online` y al volver a primer
  plano (`visibilitychange`). **No dependas de Background Sync** (no existe en iOS Safari).
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
  importación solo en `import_records.raw`. No añadas columnas al núcleo para un sistema concreto.
- Si una integración necesita estructura propia, va en tablas con prefijo `integration_` y su
  propia migración, sin llaves foráneas desde el núcleo hacia ellas.

### Migraciones
- Una migración, una preocupación. Nombre: `AAAAMMDDHHMMSS_verbo_objeto.sql`.
- Nunca edites una migración ya integrada a `main`: agrega otra.
- Toda migración debe aplicarse limpia con `pnpm db:reset` y dejar las pruebas en verde.
- Incluye `comment on table` / `comment on column` para todo lo que no sea obvio.
- Datos semilla de catálogos en `supabase/seed.sql`, idempotentes y ficticios.

### Seguridad (RLS)
- RLS activado en **toda** tabla del esquema expuesto, sin excepción, con política explícita
  por operación y rol.
- Usa `(select auth.uid())` dentro de las políticas (mejor rendimiento) y funciones auxiliares
  `stable` como `has_role(...)`.
- **Los roles viven en una tabla (`user_roles`)**; nunca en metadatos editables por el usuario.
- Funciones `security invoker` por defecto. `security definer` solo con justificación escrita,
  `set search_path = ''`, nombres calificados con esquema y permisos explícitos:
  `revoke execute ... from public; grant execute ... to authenticated;`.
- `ticket_events` es **solo de agregar**: sin políticas ni permisos de `update`/`delete`, y un
  disparador que lo impida.
- Las funciones de transición validan: rol, transición permitida, campos obligatorios e
  idempotencia (`client_request_id` único), y escriben el evento en la misma transacción.
- Una función por transición; nada de una función gigante con `case`.

### Rendimiento
- Índices en claves foráneas y en columnas de filtro frecuentes (estado, fechas, edificio).
- Las métricas son **vistas** (o materializadas si el volumen lo pide). Los intervalos y el
  mes **se calculan, no se almacenan**.

## 11. Edge Functions

- Las del núcleo, solo para lo que no cabe en SQL: notificaciones push, reportes pesados.
- Las de integración se llaman `integration-<nombre>` y cumplen la sección 4.
- Validan la entrada con Zod, autentican al llamante y usan la `service role key` únicamente
  dentro de la función, leída de secretos del entorno.
- Idempotentes y con registro de errores. Sin lógica de negocio duplicada de la base.

## 12. Errores, registro y seguridad

- Nunca un `catch` vacío. Un error se maneja, se transforma en un error de dominio o se
  propaga; y el usuario recibe un mensaje claro en español.
- Sin `console.log` en el código integrado (se permiten `console.warn` y `console.error`).
  Usa un módulo `lib/logger` para centralizar.
- Jamás registres datos personales, tokens ni claves.
- Entradas siempre validadas; salidas de texto libre siempre escapadas (React lo hace;
  no uses `dangerouslySetInnerHTML`).
- Variables de entorno: solo `VITE_*` públicas en el cliente; lo secreto nunca llega al
  cliente. Mantén `.env.example` actualizado.
- Archivos de evidencia en almacenamiento privado con URL firmadas y límites de tipo y tamaño.

## 13. Pruebas

| Nivel | Qué cubre | Prioridad |
|---|---|---|
| pgTAP | RLS y transiciones: quién ve qué y qué pasos se permiten | **Máxima** |
| Vitest | Funciones de `domain/`, esquemas Zod, hooks con lógica | Alta |
| Playwright | Flujos críticos, incluido el del técnico sin conexión | Pocos y bien elegidos |

- Toda función `domain/` nueva lleva pruebas. Toda tabla nueva, pruebas RLS. Toda función de
  transición, pruebas de caso válido, rol incorrecto, transición inválida y repetición
  idempotente.
- Las pruebas son deterministas: sin dependencia de hora real (inyecta el reloj), de orden
  o de red externa.
- Nombres de prueba descriptivos en español: `rechaza la transición si el rol no es supervisor`.
- **Nunca debilites, omitas o borres una prueba para que pase.** Un bug corregido se acompaña
  de una prueba que lo reproduce.
- El núcleo debe tener sus pruebas completas **sin cargar ningún adaptador de integración**.

## 14. Herramientas que hacen cumplir estas reglas

Configúralas en el arranque; el CI y `pnpm check` las ejecutan.

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

- **Fronteras entre capas** con `dependency-cruiser` o `eslint-plugin-boundaries`, que
  hagan fallar el build al violar la sección 4 (incluida la restricción de importar el
  cliente de Supabase solo desde `features/*/api` y `lib/`, la prohibición de que el núcleo
  importe de `features/integrations/` y la ausencia de ciclos).
- **`pnpm check:agnostic`** (por ejemplo `scripts/check-agnostic.mjs`): busca una lista
  configurable de nombres de plataformas de terceros (mayúsculas y minúsculas) en todo el
  repositorio y falla si aparecen fuera de las rutas permitidas de la sección 4. La lista vive
  en un archivo de configuración dentro de `scripts/`, que es la única excepción.
- **Prettier** para formato; **knip** para código y dependencias sin uso.
- **Husky + lint-staged** (formato y lint al confirmar) y **commitlint** (Conventional Commits).
- **`supabase db lint`** para revisar el esquema.
- **CI** (GitHub Actions o Forgejo) ejecutando la compuerta completa en cada cambio.

## 15. Definición de terminado (toda tarea)

- [ ] `pnpm check` en verde (lint, tipos, independencia, pruebas, pgTAP, build), con la salida mostrada.
- [ ] Pruebas nuevas o actualizadas para el comportamiento cambiado.
- [ ] Si hubo migración: `pnpm db:reset` limpio y `pnpm db:types` ejecutado y confirmado.
- [ ] Documentación actualizada en el mismo commit (incluido `docs/dominio.md` si cambió el negocio).
- [ ] Sin `console.log`, sin código comentado, sin `TODO` sin registrar en `docs/ESTADO.md`.
- [ ] Sin secretos, `.env.example` al día.
- [ ] El núcleo no depende de ninguna plataforma externa.
- [ ] `docs/ESTADO.md` actualizado y, si aplica, un ADR creado.

## 16. Documentación

| Documento | Contenido |
|---|---|
| `README.md` | Cómo levantar el proyecto en 10 minutos |
| `AGENTS.md` | Reglas cortas para el agente |
| `docs/ESTADO.md` | Estado, hoja de ruta, bloqueos |
| `docs/dominio.md` | Flujo, modelo conceptual y glosario del núcleo |
| `docs/integraciones-y-migracion.md` | Adaptadores, origen actual de los datos y migración |
| `docs/convenciones-codigo.md` | Este documento |
| `docs/decisions/NNNN-titulo.md` | Una decisión de arquitectura por archivo |

- **TSDoc** solo en funciones públicas de `lib/` y en el `index.ts` de cada feature: qué hace,
  parámetros y errores. No comentes lo evidente.
- **Comentarios en el código explican el porqué**, nunca el qué. Si hace falta explicar
  qué hace, renombra o reestructura.
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

- Decisiones que ya merecen ADR desde el arranque: Vite + React como SPA, Supabase,
  Recharts en lugar de ECharts, cola offline con Dexie, modelo de bloqueos dirigido por datos,
  independencia del núcleo respecto a plataformas externas.
- **Regla clave:** un cambio que altera el comportamiento actualiza su documentación en el
  mismo commit.

## 17. Git

- Ramas cortas: `feat/...`, `fix/...`, `refactor/...`, `docs/...`, `chore/...`. Se integra a
  `main` solo con `pnpm check` en verde.
- **Conventional Commits** en español: `feat(tickets): agrega asignación a técnico`.
  Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.
- Un commit, una idea; cada commit deja el proyecto compilando y con pruebas en verde.
- Nunca subas `.env`, claves, volcados de datos reales ni archivos generados por el build.
- Datos reales de cualquier fuente nunca se suben al repositorio; usa datos ficticios en las
  pruebas y las semillas.

## 18. Dependencias

- Antes de añadir una: ¿se resuelve con lo que ya hay o con pocas líneas propias? Si no,
  verifica en el registro que existe, es la oficial, está mantenida y su licencia es MIT,
  Apache-2.0, BSD o ISC.
- Versiones fijadas por el archivo de bloqueo (`pnpm-lock.yaml`), que siempre se confirma.
- Justifica cada dependencia nueva en el mensaje del commit. `knip` detecta las que sobran.
- No añadas SDK ni clientes de plataformas de terceros al núcleo; si una integración los
  necesita, viven solo en su adaptador.

## 19. Anti-patrones prohibidos

- Componentes con llamadas directas a Supabase.
- `update` directo al estatus del tiquet desde el cliente.
- Lógica de negocio dentro de componentes o rutas.
- Archivos "utils" o "helpers" genéricos que crecen sin límite: nombra por propósito.
- Estado del servidor copiado a `useState`.
- Valores mágicos (cadenas de estado, roles, IDs) repetidos en varios archivos.
- `any`, `@ts-ignore`, `eslint-disable` sin razón escrita.
- Tablas sin RLS; funciones `security definer` sin `search_path` fijo.
- Modificar migraciones ya integradas.
- Nombres, campos, estados o reglas de otra plataforma dentro del núcleo; hacer que el núcleo
  espere o dependa de un sistema externo.
- Tocar producción, nube real o credenciales sin confirmación de la persona.
- Hacer pasar una prueba modificándola en lugar de corregir el código.
