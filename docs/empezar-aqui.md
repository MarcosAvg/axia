# Axia — Empezar aquí

> Guía para **llegar a un equipo nuevo** o **retomar el proyecto**. El estado y lo siguiente están
> siempre en [`docs/ESTADO.md`](ESTADO.md); la fuente de verdad del negocio, en
> [`docs/especificacion-negocio.md`](especificacion-negocio.md).

La idea en una frase: **git es la fuente de verdad** (código, migraciones, semilla, pruebas y
documentación) y **la base de datos local se reproduce** con `pnpm db:start` + `pnpm db:reset`.

## 1. Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | LTS (probado con 24) | |
| pnpm | 12 | `corepack enable`; la versión está fijada en `package.json` |
| Git | reciente | |
| Docker + Compose | reciente | Lo necesita el Supabase local |

**Linux y Docker:** tu usuario debe pertenecer al grupo `docker` (`sudo usermod -aG docker $USER`)
y **cerrar y reabrir la sesión** para que surta efecto. Los procesos ya en ejecución no heredan el
grupo nuevo (nos pasó: `docker ps` seguía dando `permission denied` hasta reiniciar).

## 2. Arranque en 5 minutos

**Opción A — script (recomendado):**

```bash
corepack enable
git clone <url-del-repositorio> axia
cd axia
bash scripts/bootstrap.sh
```

El script es **idempotente**: instala dependencias, levanta Supabase, aplica migraciones + semilla,
genera `apps/web/.env.local` e instala Chromium para Playwright.

**Opción B — manual:**

```bash
corepack enable
git clone <url-del-repositorio> axia
cd axia
pnpm install          # dependencias y hooks de git (Husky)
pnpm db:start         # Supabase local (la primera vez descarga las imágenes)
pnpm db:reset         # aplica migraciones y semilla
pnpm env:local        # escribe apps/web/.env.local desde el Supabase local
pnpm --filter @axia/web exec playwright install chromium   # navegador de la prueba E2E
pnpm dev              # http://localhost:5173
```

No hace falta Supabase para ver la pantalla de acceso; sí para iniciar sesión, trabajar con la base
o correr `pnpm check` (que incluye las pruebas pgTAP y de sesión).

**Usuarios demo** (ficticios, solo entorno local; contraseña `AxiaDemo2026!`): `admin@axia.test`,
`supervisor@axia.test`, `tecnico@axia.test` y `solicitante@axia.test`. El alta de cuentas es solo por
administrador o invitación: no hay auto-registro.

## 3. Variables de entorno (`apps/web/.env.local`)

Genéralo con **`pnpm env:local`** (lee la URL y la clave pública de `pnpm db:start`). También puedes
copiarlas a mano a `apps/web/.env.local`; ese archivo **no se sube** (ver `apps/web/.env.example`).
Hace falta para iniciar sesión, compilar la app y correr Playwright.

## 4. Verificación

```bash
pnpm check
```

Debe salir en verde. Como incluye `pnpm db:test` (pgTAP), **requiere que el Supabase local esté
levantado** (`pnpm db:start`). Qué corre: lint, tipos, independencia del núcleo (`check:agnostic`),
fronteras entre capas (`check:boundaries`), knip, Vitest, Playwright, pgTAP y build.

## 5. Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (http://localhost:5173) |
| `pnpm build` | Compila a `apps/web/dist` |
| `pnpm lint` / `pnpm typecheck` | ESLint / tipos |
| `pnpm test` | Vitest + Playwright |
| `pnpm format` | Prettier |
| `pnpm knip` | Código y dependencias sin uso |
| `pnpm check:agnostic` | Falla si el núcleo menciona plataformas externas |
| `pnpm check:boundaries` | Reglas de dependencia entre capas |
| `pnpm db:start` / `pnpm db:stop` | Levanta/apaga el Supabase local |
| `pnpm db:reset` | Reconstruye la base local (migraciones + semilla) |
| `pnpm db:test` | Pruebas pgTAP |
| `pnpm db:types` | Regenera los tipos de TypeScript desde la base |
| `pnpm env:local` | Escribe `apps/web/.env.local` desde el Supabase local |
| **`pnpm check`** | **Compuerta completa** (todo lo anterior + `db:test` + build) |

## 6. ¿Tengo que bajar el repo otra vez?

**No.** Solo se **clona una vez por equipo**; después se hace `git pull`.

| Situación | Qué hacer |
|---|---|
| Equipo nuevo (primera vez) | `git clone` una vez (o el script) |
| Mismo equipo, otro día | `git pull` y sigues |
| Entre tus dos equipos | `git push` al terminar en uno; `git pull` al llegar al otro |

**Lo que no viaja por git** (y cómo se recupera):

| No viaja | Cómo se recupera |
|---|---|
| `node_modules` | `pnpm install` |
| Base de datos local (volúmenes Docker) | `pnpm db:reset` (migraciones + semilla) |
| `apps/web/.env.local` y claves | generar con `pnpm env:local` (o copiar de `pnpm db:start`) |
| Imágenes de Docker y navegadores de Playwright | se descargan la primera vez por equipo |
| `supabase/.temp` | se regenera solo |

**Rutina al llegar a un equipo:**

```bash
git pull        # trae lo último
pnpm install    # si cambió pnpm-lock.yaml
pnpm db:start   # si no está levantado
pnpm db:reset   # solo si hubo migraciones nuevas
pnpm dev
```

Y al irte: `git push` (cada sesión termina publicada, para que el otro equipo solo haga `git pull`).

## 7. Continuar una tarea a medias

1. `git status` y `git branch` para ver dónde quedaste (rama y cambios sin confirmar).
2. Lee `docs/ESTADO.md`: la sección **"En curso"** describe la tarea y su plan; **"Siguiente"**,
   lo que falta.
3. Si hay dudas abiertas, están en la tabla de bloqueos de `docs/ESTADO.md`.
4. Corre `pnpm check` para confirmar que el punto de partida está en verde.

## 8. Trabajar con opencode

- Abre opencode **dentro de la carpeta del repo**; toma `AGENTS.md` automáticamente y las
  instrucciones de `opencode.json` (convenciones, dominio, estado y especificación).
- Pídele leer `docs/ESTADO.md` al iniciar. El agente escribe un plan corto en "En curso", trabaja en
  una rama (`feat/…`, `fix/…`, `docs/…`), corre `pnpm check` y deja la evidencia real.
- No hay revisión humana línea por línea: la compuerta (`pnpm check`) y las pruebas son el revisor.
- El agente **nunca** toca producción, la nube real ni credenciales sin que se lo pidas.

## 9. Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `permission denied` al usar `docker` | Falta el grupo `docker` o la sesión no se ha reiniciado (ver §1) |
| `pnpm db:start` falla por puertos | 54321-54323 ocupados; libera o detén otro Supabase (`pnpm db:stop`) |
| pnpm bloquea el postinstall de Supabase | `pnpm approve-builds` y autorízalo |
| `pnpm check` falla en `db:test` | Supabase no está levantado (`pnpm db:start`) o hay que `pnpm db:reset` |
| No puedo iniciar sesión en local | Los usuarios demo se siembran con `pnpm db:reset`; verifica `apps/web/.env.local` (`pnpm env:local`) |
| Playwright no encuentra el navegador | `pnpm --filter @axia/web exec playwright install chromium` (en CI: `--with-deps`) |
| Avisos de versiones | Fijadas a propósito: jsdom `^29`, TypeScript `~6.0.2`, ESLint 9 (ver notas en `docs/ESTADO.md`) |

## 10. Seguridad

- **Nunca** se suben `.env`, claves ni volcados de datos reales. La `service role key` jamás llega
  al frontend, al repositorio ni a los logs.
- La base local es solo de desarrollo; los datos de ejemplo son ficticios.
- Producción y despliegues se preparan en `deploy/` y los ejecuta la persona (no el agente).

## 11. Estado actual y siguiente

Las **Fases 1 (base de datos núcleo) y 2 (autenticación y estructura de la app)** quedaron cerradas.
Lo siguiente es la **Fase 3 (pantallas principales)**. Detalle, hoja de ruta y bloqueos:
`docs/ESTADO.md`.
