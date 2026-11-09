# Axia — Guía para asistentes de código

Axia es una plataforma propia y autónoma de seguimiento de tiquets de mantenimiento: multiusuario,
con roles, PWA (escritorio y móvil), autoalojable y open source. Su razón de ser: que en todo
momento se sepa el estado exacto de cada tiquet y, si no avanza, **por qué** y en qué estado está
ese motivo, con evidencias en cada paso.

Este archivo orienta a asistentes que trabajan en el repositorio. No define reglas de negocio: la
autoridad es [la especificación](docs/concepts/negocio.md) y el estilo está en
[las convenciones](docs/reference/convenciones-codigo.md).

## 1. Independencia del núcleo

- El **núcleo** de Axia funciona completo por sí solo: los tiquets se crean, asignan, ejecutan,
  pausan, resuelven y miden dentro de Axia.
- No depende de plataformas externas, servicios de terceros ni una segunda fuente de verdad.
- Infraestructura: PostgreSQL 17 autoalojado y un único servidor Fastify. La web habla solo con
  `/api`; el modelo de datos es Postgres estándar.

## 2. Modo de trabajo

- Elige la opción más simple y reversible. Si la decisión importa (librería, estructura, patrón),
  regístrala en `docs/decisions/NNNN-titulo.md`.
- Trabaja en ciclos pequeños: una tarea, sus pruebas y su commit.
- No inventes reglas de negocio ni de seguridad. Si una regla no está documentada, pregunta antes
  de asumirla.
- No debilites ni borres pruebas, reglas de lint o de tipos para conseguir un resultado verde.
- Las pruebas, el linter y el verificador de tipos son la comprobación. Nada está terminado hasta
  que pasan, y conviene mostrar su salida real. No afirmes que algo funciona sin haberlo ejecutado.

## 3. Stack

- Monorepo pnpm (no uses npm ni yarn): `apps/web`, `apps/server`, `deploy/`, `docs/`.
- Frontend: Vite + React + TypeScript (SPA/PWA). Sin meta-framework.
- UI: Tailwind + shadcn/ui. Gráficas: Recharts (componente `chart` de shadcn/ui). No uses ECharts.
- Datos: TanStack Router (rutas por carpetas), TanStack Query, TanStack Table.
- Formularios: React Hook Form + Zod.
- Offline: Dexie (IndexedDB) con cola de salida (`outbox`).
- Backend: PostgreSQL 17 + Drizzle + Fastify 5 + TypeScript; autenticación local con sesiones
  opacas, SSE, TUS/Sharp y sincronización offline.
- Pruebas: Vitest contra PostgreSQL real (servidor y base), Vitest (web) y Playwright (flujos).

## 4. Comandos

Si algún script no existe, créalo durante el arranque.

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` / `pnpm build` | Chequeos individuales |
| `pnpm test:affected` | Pruebas Vitest relacionadas con los archivos cambiados |
| `pnpm test:e2e:smoke` | Flujos críticos de Playwright (`@smoke`) |
| `pnpm check:docs` | Enlaces relativos de la documentación |
| `pnpm db:start` / `pnpm db:reset` | PostgreSQL local / reconstruir base local |
| `pnpm db:test` | Integración del servidor contra PostgreSQL real |
| `pnpm db:demo -- --demo` | Semilla demo explícita, solo local |
| **`pnpm check:fast`** | **Ciclo local**: lint + typecheck + unitarias |
| `pnpm check:static` | Scripts, docs, fronteras y knip |
| **`pnpm check`** | **Compuerta completa**: estáticos + unitarias + Playwright + PostgreSQL + build |

## 5. Reglas de oro (no negociables)

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
8. Nunca inventes datos. Los valores desconocidos se guardan como `NULL`.
9. Fechas en `timestamptz`; zona horaria configurable, nunca fija en el código.
10. Código, tablas y columnas en inglés. Textos de interfaz en español (es-MX).
11. Actualiza la documentación en el mismo commit que cambia el comportamiento.
12. Estilo y límites: `docs/reference/convenciones-codigo.md`. Reglas del negocio:
    `docs/concepts/negocio.md`.

## 6. Límites: requieren confirmación explícita

Nunca, sin que quien mantiene el proyecto lo pida claramente en la sesión:

- `git push --force`, `git reset --hard` con trabajo sin confirmar, borrar ramas remotas.
- `rm -rf` fuera del proyecto, `sudo`, instalar paquetes globales, `curl ... | sh`.
- Leer, mostrar o registrar el contenido de `.env` o de cualquier clave.
- Tocar producción o la nube real: despliegues, DNS, servidor, bases gestionadas. Trabaja solo
  con el entorno local; para lo demás, prepara scripts y documenta los pasos para que los ejecute
  quien opera la instancia.
- Debilitar o borrar pruebas, reglas de lint o de tipos para que algo pase. Si una prueba es
  incorrecta, explica por qué en el commit y en un ADR.
- Añadir una dependencia sin verificar que existe en el registro, que es la oficial, que está
  mantenida y que su licencia es compatible (MIT, Apache-2.0, BSD, ISC), y sin justificarla en el
  commit.

## 7. Cómo verificar

- Durante el desarrollo corre `pnpm check:fast` y `pnpm test:affected`; no repitas la compuerta
  completa tras cada edición.
- Antes de cada merge a `main` corre `pnpm check` completo una vez. Si falla, corrige con la suite
  afectada y vuelve a ejecutar la compuerta al final, no en cada intento.
- Para cambios de interfaz, `pnpm test:e2e:smoke` es el mínimo local; el E2E completo queda para
  el cierre. Para migraciones, ejecuta toda la integración de PostgreSQL.
- Para librerías que cambian rápido (TanStack Router, shadcn/ui, Drizzle, Fastify,
  vite-plugin-pwa, Recharts): no confíes en la memoria. Revisa los tipos instalados en
  `node_modules` o la documentación oficial de la versión instalada.
- Si un comando falla, lee el error completo. Tras 3 intentos sin avance, cambia de enfoque o
  registra el bloqueo en el resumen del cambio. No repitas lo mismo a ciegas.
- Todo bug corregido lleva una prueba que lo reproduce.

## 8. Proceso por tarea

1. Lee la especificación, las convenciones y los [límites vigentes](docs/reference/limitaciones.md).
2. Crea una rama (`feat/...`, `fix/...`, `docs/...`, `refactor/...`, `chore/...`) y haz commits
   pequeños con Conventional Commits.
3. Escribe o actualiza pruebas, implementa y corre las pruebas afectadas. Usa `pnpm check:fast`
   para el ciclo y `pnpm test:affected` para el subconjunto relacionado.
4. Antes de integrar, corre `pnpm check` completo una vez. Integra a `main` solo con la compuerta
   en verde.
5. Actualiza el `CHANGELOG.md` cuando cambie el comportamiento visible y, si cambió un límite o un
   pendiente, la referencia de [límites y pendientes](docs/reference/limitaciones.md).

## 9. Documentos del proyecto

- `README.md`: presentación y entradas principales.
- `docs/start/desarrollo.md`: entorno local, demo, pruebas, continuidad y solución de problemas.
- `docs/concepts/negocio.md`: **fuente de verdad del negocio** (flujo, estados, reglas, tiempos y
  permisos). **Léela antes de tocar cualquiera de esos temas.** Si algo contradice a la
  especificación, manda la especificación.
- `docs/concepts/dominio.md`: vocabulario y orientación del núcleo, sin duplicar reglas.
- `docs/concepts/datos.md`: modelo de datos actual (dominios, relaciones y reglas).
- `docs/reference/convenciones-codigo.md`: estructura, estilo, pruebas, SQL, git, herramientas.
- `docs/reference/limitaciones.md`: límites conocidos y pendientes operativos.
- `deploy/README.md`: instalación de una instancia y primer administrador.
- `docs/decisions/`: decisiones de arquitectura (ADR).
