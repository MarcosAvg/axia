# Empezar aquí

## Objeto

Guía para incorporarse al proyecto o retomarlo. El estado y el trabajo siguiente están en
[`ESTADO.md`](ESTADO.md); la fuente de verdad del negocio, en
[`especificacion-negocio.md`](especificacion-negocio.md).

Idea central: **git es la fuente de verdad** (código, migraciones, semilla, pruebas y documentación)
y **la base de datos local se reproduce** con `pnpm db:start` y `pnpm db:reset`.

## Tabla de contenidos

- [1. Requisitos](#1-requisitos)
- [2. Puesta en marcha](#2-puesta-en-marcha)
- [3. Variables de entorno](#3-variables-de-entorno)
- [4. Verificación](#4-verificación)
- [5. Comandos](#5-comandos)
- [6. Volver a clonar el repositorio](#6-volver-a-clonar-el-repositorio)
- [7. Continuar una tarea a medias](#7-continuar-una-tarea-a-medias)
- [8. Trabajar con opencode](#8-trabajar-con-opencode)
- [9. Solución de problemas](#9-solución-de-problemas)
- [10. Seguridad](#10-seguridad)
- [11. Estado actual](#11-estado-actual)

## 1. Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | LTS (probado con 24) | Ver `.nvmrc` |
| pnpm | 12 | `corepack enable`; versión fijada en `package.json` |
| Git | reciente | |
| Docker y Compose | reciente | Necesario para el Supabase local |

**Linux y Docker:** el usuario debe pertenecer al grupo `docker` (`sudo usermod -aG docker $USER`) y
**cerrar y reabrir la sesión** para que surta efecto. Los procesos ya en ejecución no heredan el grupo
nuevo, por lo que `docker ps` puede seguir devolviendo `permission denied` hasta reiniciar la sesión.

## 2. Puesta en marcha

**Opción A — script (recomendado):**

```bash
corepack enable
git clone <url-del-repositorio> axia
cd axia
bash scripts/bootstrap.sh
```

El script es **idempotente**: instala dependencias, levanta Supabase, aplica migraciones y semilla,
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

Supabase no es necesario para ver la pantalla de acceso; sí lo es para iniciar sesión, trabajar con la
base o ejecutar `pnpm check` (que incluye las pruebas pgTAP y de sesión).

**Usuarios demo** (ficticios, solo entorno local; contraseña `AxiaDemo2026!`): `admin@axia.test`,
`supervisor@axia.test`, `tecnico@axia.test` y `solicitante@axia.test`. El alta de cuentas es solo por
administrador o invitación: no hay auto-registro.

## 3. Variables de entorno

Se generan con **`pnpm env:local`** (toma la URL y la clave pública de `pnpm db:start`) en
`apps/web/.env.local`. También es posible copiarlas manualmente. El archivo **no se incorpora al
repositorio** (ver `apps/web/.env.example`). Es necesario para iniciar sesión, compilar la aplicación
y ejecutar Playwright.

## 4. Verificación

```bash
pnpm check
```

Debe quedar en verde. Como incluye `pnpm db:test` (pgTAP), **requiere el Supabase local levantado**
(`pnpm db:start`). Ejecuta: lint, tipos, independencia del núcleo (`check:agnostic`), fronteras entre
capas (`check:boundaries`), knip, Vitest, Playwright, pgTAP y build.

## 5. Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo (http://localhost:5173) |
| `pnpm build` | Compila a `apps/web/dist` |
| `pnpm lint` / `pnpm typecheck` | ESLint / tipos |
| `pnpm test` | Vitest y Playwright |
| `pnpm format` | Prettier |
| `pnpm knip` | Código y dependencias sin uso |
| `pnpm check:agnostic` | Falla si el núcleo menciona plataformas externas |
| `pnpm check:boundaries` | Reglas de dependencia entre capas |
| `pnpm db:start` / `pnpm db:stop` | Levanta o apaga el Supabase local |
| `pnpm db:reset` | Reconstruye la base local (migraciones y semilla) |
| `pnpm db:test` | Pruebas pgTAP |
| `pnpm db:types` | Regenera los tipos de TypeScript desde la base |
| `pnpm env:local` | Escribe `apps/web/.env.local` desde el Supabase local |
| **`pnpm check`** | **Compuerta completa** (todo lo anterior, más `db:test` y build) |

## 6. Volver a clonar el repositorio

El repositorio se **clona una vez por equipo**; después se usa `git pull`.

| Situación | Acción |
|---|---|
| Equipo nuevo (primera vez) | `git clone` una vez (o el script) |
| Mismo equipo, otro día | `git pull` |
| Entre dos equipos | `git push` al terminar en uno y `git pull` al llegar al otro |

**Elementos que no viajan por git** y cómo se recuperan:

| No viaja | Recuperación |
|---|---|
| `node_modules` | `pnpm install` |
| Base de datos local (volúmenes Docker) | `pnpm db:reset` (migraciones y semilla) |
| `apps/web/.env.local` y claves | generar con `pnpm env:local` (o copiar de `pnpm db:start`) |
| Imágenes de Docker y navegadores de Playwright | se descargan la primera vez por equipo |
| `supabase/.temp` | se regenera automáticamente |

**Rutina al retomar en un equipo:**

```bash
git pull        # trae lo último
pnpm install    # si cambió pnpm-lock.yaml
pnpm db:start   # si no está levantado
pnpm db:reset   # solo si hubo migraciones nuevas
pnpm dev
```

## 7. Continuar una tarea a medias

1. `git status` y `git branch` para ver la rama y los cambios sin confirmar.
2. Leer `ESTADO.md`: la sección **«En curso»** describe la tarea y su plan; **«Siguiente»**, lo que
   falta.
3. Las dudas abiertas están en la tabla de bloqueos de `ESTADO.md`.
4. Ejecutar `pnpm check` para confirmar que el punto de partida está en verde.

## 8. Trabajar con opencode

- Abrir opencode **dentro de la carpeta del repositorio**: toma `AGENTS.md` automáticamente y las
  instrucciones de `opencode.json` (convenciones, dominio, estado y especificación).
- Pedirle leer `ESTADO.md` al iniciar. El agente escribe un plan corto en «En curso», trabaja en una
  rama (`feat/…`, `fix/…`, `docs/…`), ejecuta `pnpm check` y deja la evidencia real.
- No hay revisión humana línea por línea: la compuerta (`pnpm check`) y las pruebas son el revisor.
- El agente **nunca** toca producción, la infraestructura real ni credenciales sin autorización
  explícita.

## 9. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `permission denied` al usar `docker` | Falta el grupo `docker` o la sesión no se ha reiniciado (§1) |
| `pnpm db:start` falla por puertos | 54321-54323 ocupados; liberar o detener otro Supabase (`pnpm db:stop`) |
| pnpm bloquea el postinstall de Supabase | `pnpm approve-builds` y autorizarlo |
| `pnpm check` falla en `db:test` | Supabase no está levantado (`pnpm db:start`) o procede `pnpm db:reset` |
| No se puede iniciar sesión en local | Los usuarios demo se siembran con `pnpm db:reset`; verificar `apps/web/.env.local` (`pnpm env:local`) |
| Playwright no encuentra el navegador | `pnpm --filter @axia/web exec playwright install chromium` (en CI, `--with-deps`) |
| Avisos de versiones | Fijadas a propósito: jsdom `^29`, TypeScript `~6.0.2`, ESLint 9 (ver `ESTADO.md`) |

## 10. Seguridad

- **Nunca** se suben archivos `.env`, claves ni volcados de datos reales. La **clave de servicio**
  nunca llega al frontend, al repositorio ni a los registros.
- La base local es solo de desarrollo; los datos de ejemplo son ficticios.
- El despliegue de producción se prepara en `deploy/` y lo ejecuta la persona, no el agente.

## 11. Estado actual

Todas las fases (0–7) están cerradas. El trabajo pendiente es operativo: despliegue y activación de
correo, push y escalamiento cuando exista la infraestructura. La hoja de ruta y los bloqueos están en
[`ESTADO.md`](ESTADO.md).
