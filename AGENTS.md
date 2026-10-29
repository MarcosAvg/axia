# Axia — Instrucciones para el agente

Axia es una plataforma **propia y autónoma** de seguimiento de tiquets de mantenimiento:
multiusuario, con roles, PWA (escritorio y móvil), autoalojable y open source. Su razón de
ser: que en todo momento se sepa el estado exacto de cada tiquet y, si no avanza, **por qué**
y en qué estado está ese motivo, con evidencias en cada paso.

## 1. Principio de independencia: Axia es agnóstica

- El **núcleo** de Axia funciona completo por sí solo: los tiquets se crean, asignan, ejecutan,
  pausan, resuelven y miden dentro de Axia.
- **Ninguna plataforma externa es requisito, fuente de verdad ni parte del diseño del núcleo.**
  Otros sistemas donde hoy viven los datos (plataformas de reporte, hojas de cálculo) son solo
  **referencia** o **fuentes opcionales** de datos.
- Todo lo que toque un sistema externo vive detrás de **adaptadores aislados**. En esta versión
  no se publican adaptadores externos; si se añaden, no modifican el núcleo.
- En el núcleo (esquema SQL, enums, interfaz, lógica, textos) **no aparecen nombres, campos,
  estados ni reglas de otra plataforma**. Los identificadores externos se guardan solo en la
  tabla genérica `ticket_external_refs(system, external_id)`, y el núcleo no conoce sus valores.
- Los nombres de plataformas de terceros solo pueden aparecer en el código de los adaptadores
  y en `docs/history/integraciones-y-migracion.md`. Lo verifica `pnpm check:agnostic`.
- Prueba de fuego ante la duda: *¿Axia funcionaría igual si esa plataforma dejara de existir?*
  Si no, está mal ubicado.
- Las integraciones son opcionales y, por defecto, de **entrada** (importar). Nada en Axia
  debe quedar esperando a que otro sistema se actualice.
- Infraestructura: PostgreSQL 17 autoalojado y un único servidor Fastify. La web habla solo con
  `/api`; el modelo de datos es Postgres estándar.

## 2. Modo de trabajo: autónomo, sin revisión humana

Tú escribes todo el código y nadie lo revisa línea por línea. Por eso:

- Tú decides todo lo técnico. Elige la opción más simple y reversible. Si la decisión
  importa (librería, estructura, patrón), regístrala en `docs/decisions/NNNN-titulo.md`.
- Las pruebas, el linter y el verificador de tipos son tu revisor. Nada está terminado
  hasta que pasan, y debes mostrar su salida real. Nunca afirmes que algo funciona sin
  haberlo ejecutado.
- Solo consultas a la persona para: (1) reglas de negocio ambiguas o no documentadas,
  (2) credenciales, dominios o infraestructura real, (3) acciones de la sección 7.
- Al consultar: una pregunta concreta, con opciones y tu recomendación. Registra el
  bloqueo en `docs/internal/estado.md`, pasa a otra tarea que no dependa de la respuesta y, si no
  hay ninguna, detente. No adivines reglas de negocio ni de seguridad.

## 3. Continuidad entre sesiones

1. Al iniciar, lee `docs/internal/estado.md` (hecho, siguiente, bloqueos, decisiones).
2. Al terminar cada tarea, actualízalo: qué hiciste, qué sigue, preguntas abiertas.
3. Trabaja en ciclos pequeños: una tarea, sus pruebas, su commit.

## 4. Stack

- Monorepo pnpm (no uses npm ni yarn): `apps/web`, `apps/server`, `deploy/`, `docs/`.
- Frontend: Vite + React + TypeScript (SPA/PWA). Sin meta-framework.
- UI: Tailwind + shadcn/ui. Gráficas: Recharts (componente `chart` de shadcn/ui). No uses ECharts.
- Datos: TanStack Router (rutas por carpetas), TanStack Query, TanStack Table.
- Formularios: React Hook Form + Zod.
- Offline: Dexie (IndexedDB) con cola de salida (`outbox`).
- Backend: PostgreSQL 17 + Drizzle + Fastify 5 + TypeScript; autenticación local con sesiones
  opacas, SSE, TUS/Sharp y sincronización offline.
- Pruebas: Vitest contra PostgreSQL real (servidor y base), Vitest (web) y Playwright (flujos).

## 5. Comandos

Si algún script no existe, créalo durante el arranque.

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` / `pnpm build` | Chequeos individuales |
| `pnpm test:affected` | Pruebas Vitest relacionadas con los archivos cambiados |
| `pnpm test:e2e:smoke` | Flujos críticos de Playwright (`@smoke`) |
| `pnpm check:agnostic` | Verifica que el núcleo no mencione plataformas de terceros |
| `pnpm db:start` / `pnpm db:reset` | PostgreSQL local / reconstruir base local |
| `pnpm db:test` | Integración del servidor contra PostgreSQL real |
| `pnpm db:demo -- --demo` | Semilla demo explícita, solo local |
| **`pnpm check:fast`** | **Ciclo local**: lint + typecheck + unitarias |
| `pnpm check:static` | Scripts, docs, agnóstico, fronteras y knip |
| **`pnpm check`** | **Compuerta completa**: estáticos + unitarias + Playwright + PostgreSQL + build |

## 6. Reglas de oro (no negociables)

1. Todo cambio de base de datos es una migración en `apps/server/db/migrations/`. Nunca edites
   una migración ya integrada a `main`: agrega otra.
2. No hay RLS: la autorización vive en el servidor (`can`/`canAct` y repositorios con alcance).
   Toda tabla y consulta nueva lleva pruebas de permisos positivas y negativas.
3. El estatus del tiquet solo cambia mediante una acción del servidor, y cada cambio escribe un
   evento en `ticket_events` en la misma transacción. La bitácora es solo de agregar.
4. Los secretos de base y sesión jamás van al frontend, al repositorio ni a los logs.
5. Toda acción offline lleva un UUID generado en el cliente y es idempotente.
6. Los componentes no llaman a `/api` directamente: usan `features/*/api`. Un feature solo importa
   el `index.ts` de otro.
7. La lógica de negocio va en funciones puras, con pruebas.
8. Nunca inventes datos. En importaciones, los marcadores de "sin dato" de la fuente se
   convierten en `NULL` (detalle en `docs/history/integraciones-y-migracion.md`).
9. Fechas en `timestamptz`; zona horaria configurable, nunca fija en el código.
10. Código, tablas y columnas en inglés. Textos de interfaz en español (es-MX).
11. Actualiza la documentación en el mismo commit que cambia el comportamiento.
12. Estilo y límites: `docs/reference/convenciones-codigo.md`. Reglas del negocio: `docs/concepts/dominio.md`.

## 7. Límites: requieren confirmación explícita de la persona

Nunca, sin que la persona lo pida claramente en esta sesión:

- `git push --force`, `git reset --hard` con trabajo sin confirmar, borrar ramas remotas.
- `rm -rf` fuera del proyecto, `sudo`, instalar paquetes globales, `curl ... | sh`.
- Leer, mostrar o registrar el contenido de `.env` o de cualquier clave.
- Tocar producción o la nube real: despliegues, DNS, servidor, bases gestionadas. Trabajas solo
  con el entorno local; para lo demás, prepara scripts y documenta los pasos y la persona los
  ejecuta.
- Debilitar o borrar pruebas, reglas de lint o de tipos para que algo pase. Si una
  prueba es incorrecta, explica por qué en el commit y en un ADR.
- Añadir una dependencia sin verificar que existe en el registro, que es la oficial,
  que está mantenida y que su licencia es compatible (MIT, Apache-2.0, BSD, ISC), y
  sin justificarla en el commit.

## 8. Cómo verificas tu trabajo

- Durante el desarrollo corre `pnpm check:fast` y `pnpm test:affected`; no repitas la compuerta
  completa tras cada edición.
- Antes de cada merge a `main` corre `pnpm check` completo una vez. Si falla, corrige con la
  suite afectada y vuelve a ejecutar la compuerta al final, no en cada intento.
- Para cambios de interfaz, `pnpm test:e2e:smoke` es el mínimo local; el E2E completo queda para
  el cierre. Para migraciones, ejecuta toda la integración de PostgreSQL.
- Para librerías que cambian rápido (TanStack Router, shadcn/ui, Drizzle, Fastify,
  vite-plugin-pwa, Recharts): no confíes en tu memoria. Revisa los tipos instalados en
  `node_modules` o la documentación oficial de la versión instalada.
- Si un comando falla, lee el error completo. Tras 3 intentos sin avance, cambia de
  enfoque o registra el bloqueo en `docs/internal/estado.md`. No repitas lo mismo a ciegas.
- Todo bug corregido lleva una prueba que lo reproduce.

## 9. Proceso por tarea

1. Lee `docs/internal/estado.md` y los documentos relevantes.
2. Escribe un plan de 3 a 7 líneas en `docs/internal/estado.md` (sección "En curso") y avanza.
3. Crea una rama (`feat/...`, `fix/...`), haz commits pequeños con Conventional Commits.
4. Escribe o actualiza pruebas, implementa y corre las pruebas afectadas. Usa `pnpm check:fast`
   para el ciclo y `pnpm test:affected` para el subconjunto relacionado.
5. Antes de integrar, corre `pnpm check` completo una vez. Integra a `main` solo con la compuerta
   en verde. Actualiza `docs/internal/estado.md`.
6. Entrega el informe final (sección 10).

## 10. Informe final de cada tarea

Breve y en español:

- **Qué hice** (2 a 5 líneas).
- **Evidencia**: comandos ejecutados y su resultado.
- **Decisiones** tomadas (con enlace al ADR si existe).
- **Pendientes y preguntas** para la persona, si las hay.

## 11. Documentos del proyecto

- `docs/internal/estado.md`: estado, hoja de ruta y bloqueos. Se lee siempre al iniciar.
- `docs/start/continuidad.md`: actualización, continuidad entre equipos y solución de problemas.
- `docs/concepts/negocio.md`: **fuente de verdad del negocio** (flujo, estados, reglas,
  tiempos y permisos). **Léela antes de tocar cualquiera de esos temas.** Si algo contradice a la
  especificación, manda la especificación.
- `docs/concepts/dominio.md`: resumen consistente del núcleo (flujo, modelo conceptual y glosario).
- `docs/concepts/datos.md`: modelo de datos actual (dominios, relaciones y reglas).
- `docs/reference/convenciones-codigo.md`: estructura, estilo, pruebas, SQL, git, herramientas.
- `docs/start/instalacion.md`: requisitos, instalación y primer administrador.
- `docs/history/integraciones-y-migracion.md`: **solo léelo al trabajar en importadores o
  integraciones**. Describe el origen actual de los datos como referencia.
- `docs/decisions/`: decisiones de arquitectura (ADR).
