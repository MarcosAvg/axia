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
- Todo lo que toque un sistema externo vive detrás de **adaptadores aislados**:
  `apps/web/src/features/integrations/` y `supabase/functions/integration-*`. Se pueden añadir
  o quitar sin modificar el núcleo.
- En el núcleo (esquema SQL, enums, interfaz, lógica, textos) **no aparecen nombres, campos,
  estados ni reglas de otra plataforma**. Los identificadores externos se guardan solo en la
  tabla genérica `ticket_external_refs(system, external_id)`, y el núcleo no conoce sus valores.
- Los nombres de plataformas de terceros solo pueden aparecer en el código de los adaptadores
  y en `docs/integraciones-y-migracion.md`. Lo verifica `pnpm check:agnostic`.
- Prueba de fuego ante la duda: *¿Axia funcionaría igual si esa plataforma dejara de existir?*
  Si no, está mal ubicado.
- Las integraciones son opcionales y, por defecto, de **entrada** (importar). Nada en Axia
  debe quedar esperando a que otro sistema se actualice.
- Infraestructura: Supabase es la elegida (nube o autoalojada), y el modelo de datos es Postgres
  estándar; se accede a ella solo desde `features/*/api` y `lib/`.

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
  bloqueo en `docs/ESTADO.md`, pasa a otra tarea que no dependa de la respuesta y, si no
  hay ninguna, detente. No adivines reglas de negocio ni de seguridad.

## 3. Continuidad entre sesiones

1. Al iniciar, lee `docs/ESTADO.md` (hecho, siguiente, bloqueos, decisiones).
2. Al terminar cada tarea, actualízalo: qué hiciste, qué sigue, preguntas abiertas.
3. Trabaja en ciclos pequeños: una tarea, sus pruebas, su commit.

## 4. Stack

- Monorepo pnpm (no uses npm ni yarn): `apps/web`, `packages/shared`, `supabase/`, `deploy/`, `docs/`.
- Frontend: Vite + React + TypeScript (SPA/PWA). Sin meta-framework.
- UI: Tailwind + shadcn/ui. Gráficas: Recharts (componente `chart` de shadcn/ui). No uses ECharts.
- Datos: TanStack Router (rutas por carpetas), TanStack Query, TanStack Table.
- Formularios: React Hook Form + Zod.
- Offline: Dexie (IndexedDB) con cola de salida (`outbox`).
- Backend: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions), local y autoalojado.
- Pruebas: pgTAP (base de datos), Vitest (frontend), Playwright (flujos críticos).

## 5. Comandos

Si algún script no existe, créalo durante el arranque (Fase 0 de `docs/ESTADO.md`).

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Chequeos individuales |
| `pnpm check:agnostic` | Verifica que el núcleo no mencione plataformas de terceros |
| `pnpm db:start` / `pnpm db:reset` | Supabase local / reconstruir base local |
| `pnpm db:test` | Pruebas pgTAP |
| `pnpm db:types` | Regenerar tipos de TypeScript desde la base |
| **`pnpm check`** | **Compuerta completa**: lint + typecheck + check:agnostic + test + db:test + build |

## 6. Reglas de oro (no negociables)

1. Todo cambio de base de datos es una migración en `supabase/migrations/`. Nunca edites
   una migración ya integrada a `main`: agrega otra.
2. Toda tabla lleva RLS activado y pruebas pgTAP. Los roles nunca se leen de metadatos
   que el usuario pueda editar.
3. El estatus del tiquet solo cambia mediante funciones RPC de transición, y cada cambio
   escribe un evento en `ticket_events` en la misma transacción. La bitácora es solo de agregar.
4. La `service role key` jamás va al frontend, al repositorio ni a los logs.
5. Toda acción offline lleva un UUID generado en el cliente y es idempotente.
6. Los componentes no llaman a Supabase: usan `features/*/api`. Un feature solo importa
   el `index.ts` de otro. El núcleo nunca importa de `features/integrations`.
7. La lógica de negocio va en funciones puras, con pruebas.
8. Nunca inventes datos. En importaciones, los marcadores de "sin dato" de la fuente se
   convierten en `NULL` (detalle en `docs/integraciones-y-migracion.md`).
9. Fechas en `timestamptz`; zona horaria configurable, nunca fija en el código.
10. Código, tablas y columnas en inglés. Textos de interfaz en español (es-MX).
11. Actualiza la documentación en el mismo commit que cambia el comportamiento.
12. Estilo y límites: `docs/convenciones-codigo.md`. Reglas del negocio: `docs/dominio.md`.

## 7. Límites: requieren confirmación explícita de la persona

Nunca, sin que la persona lo pida claramente en esta sesión:

- `git push --force`, `git reset --hard` con trabajo sin confirmar, borrar ramas remotas.
- `rm -rf` fuera del proyecto, `sudo`, instalar paquetes globales, `curl ... | sh`.
- Leer, mostrar o registrar el contenido de `.env` o de cualquier clave.
- Tocar producción o la nube real: `supabase db push`, `supabase functions deploy`,
  despliegues, DNS, servidor. Trabajas solo con el entorno local; para lo demás,
  prepara scripts y documenta los pasos y la persona los ejecuta.
- Debilitar o borrar pruebas, reglas de lint o de tipos para que algo pase. Si una
  prueba es incorrecta, explica por qué en el commit y en un ADR.
- Añadir una dependencia sin verificar que existe en el registro, que es la oficial,
  que está mantenida y que su licencia es compatible (MIT, Apache-2.0, BSD, ISC), y
  sin justificarla en el commit.

## 8. Cómo verificas tu trabajo

- Corre `pnpm check` antes de cada merge a `main`. Si falla, corrige la causa.
- Para librerías que cambian rápido (TanStack Router, shadcn/ui, Supabase CLI,
  vite-plugin-pwa, Recharts): no confíes en tu memoria. Revisa los tipos instalados en
  `node_modules` o la documentación oficial de la versión instalada.
- Si un comando falla, lee el error completo. Tras 3 intentos sin avance, cambia de
  enfoque o registra el bloqueo en `docs/ESTADO.md`. No repitas lo mismo a ciegas.
- Todo bug corregido lleva una prueba que lo reproduce.

## 9. Proceso por tarea

1. Lee `docs/ESTADO.md` y los documentos relevantes.
2. Escribe un plan de 3 a 7 líneas en `docs/ESTADO.md` (sección "En curso") y avanza.
3. Crea una rama (`feat/...`, `fix/...`), haz commits pequeños con Conventional Commits.
4. Escribe o actualiza pruebas, implementa, corre `pnpm check`.
5. Integra a `main` solo con la compuerta en verde. Actualiza `docs/ESTADO.md`.
6. Entrega el informe final (sección 10).

## 10. Informe final de cada tarea

Breve y en español:

- **Qué hice** (2 a 5 líneas).
- **Evidencia**: comandos ejecutados y su resultado.
- **Decisiones** tomadas (con enlace al ADR si existe).
- **Pendientes y preguntas** para la persona, si las hay.

## 11. Documentos del proyecto

- `docs/ESTADO.md`: estado, hoja de ruta y bloqueos. Se lee siempre al iniciar.
- `docs/empezar-aqui.md`: guía para llegar a un equipo nuevo o retomar el proyecto (requisitos,
  arranque, continuidad entre equipos y solución de problemas).
- `docs/especificacion-negocio.md`: **fuente de verdad del negocio** (flujo, estados, reglas,
  tiempos y permisos). **Léela antes de tocar cualquiera de esos temas.** Si algo contradice a la
  especificación, manda la especificación.
- `docs/dominio.md`: resumen consistente del núcleo (flujo, modelo conceptual y glosario).
- `docs/modelo-datos.md`: diseño de la base del núcleo (ER, estados, transiciones, permisos,
  tiempos, RLS e indicadores). Se aprueba antes de escribir migraciones.
- `docs/convenciones-codigo.md`: estructura, estilo, pruebas, SQL, git, herramientas.
- `docs/configuracion-inicial.md`: guía de arranque del entorno (Fase 0) y despliegue.
- `docs/integraciones-y-migracion.md`: **solo léelo al trabajar en importadores o
  integraciones**. Describe el origen actual de los datos como referencia.
- `docs/decisions/`: decisiones de arquitectura (ADR).
