# Empezar aquí

Guía para incorporarse o retomar Axia. El estado y el trabajo siguiente están en
[`ESTADO.md`](ESTADO.md); la fuente de verdad del negocio, en
[`especificacion-negocio.md`](especificacion-negocio.md).

Idea central: **git es la fuente de verdad** (código, migraciones, semilla, pruebas y documentación)
y **la base local se reproduce** con Docker Compose.

## 1. Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | LTS (probado con 24) | Ver `.nvmrc` |
| pnpm | 12 | `corepack enable`; versión fijada en `package.json` |
| Git | reciente | |
| Docker y Compose | reciente | PostgreSQL, migraciones y API |
| openssl | reciente | Generación de secretos |

En Linux, el usuario debe pertenecer al grupo `docker` y reiniciar la sesión.

## 2. Puesta en marcha

```bash
corepack enable
git clone <url-del-repositorio> axia
cd axia
pnpm install
./scripts/install.sh --demo
pnpm dev
```

El instalador genera `.env`, levanta PostgreSQL, aplica migraciones y arranca la API. La web queda en
`http://localhost:5173` y la API en `http://127.0.0.1:3000`.

La primera cuenta de administración se crea desde `/login` (primer arranque) o con
`POST /api/setup`. La semilla demo crea `demo.admin`, `demo.supervisor`, `demo.technician` y
`demo.requester`; la contraseña se toma de `AXIA_DEMO_PASSWORD` o se genera una vez.

## 3. Variables de entorno

`.env` lo genera `scripts/install.sh` con permisos `0600` y no se versiona. `.env.example` documenta
las variables. Para la web solo es pública `VITE_API_URL` (vacía = mismo origen). Las conexiones de
base y migraciones son secretos.

## 4. Verificación

```bash
pnpm check
```

Incluye lint, tipos, independencia, fronteras, knip, Vitest, Playwright, integración contra PostgreSQL
real y build. Necesita `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y `DATABASE_URL`; Playwright
prepara su propia base con la semilla demo.

## 5. Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | SPA en desarrollo |
| `pnpm build` | Compila servidor y SPA |
| `pnpm lint` / `pnpm typecheck` | ESLint / tipos |
| `pnpm test` | Vitest y Playwright |
| `pnpm db:start` / `pnpm db:stop` | PostgreSQL local |
| `pnpm db:reset` | Reconstruye la base con migraciones |
| `pnpm db:test` | Integración contra PostgreSQL real |
| `pnpm db:next:demo -- --demo` | Semilla demo explícita |
| `pnpm check:agnostic` | Independencia del núcleo |
| `pnpm check:boundaries` | Fronteras entre capas |
| `pnpm knip` | Código y dependencias sin uso |
| **`pnpm check`** | **Compuerta completa** |

## 6. Volver a clonar o retomar

| No viaja por git | Recuperación |
|---|---|
| `node_modules` | `pnpm install` |
| Base local (volumen Docker) | `pnpm db:reset` |
| `.env` | `./scripts/install.sh` o recuperar el archivo original |
| Imágenes y navegadores | se descargan por equipo |

Rutina al retomar:

```bash
git pull
pnpm install
pnpm db:start
pnpm db:reset   # solo si hubo migraciones nuevas
pnpm dev
```

## 7. Continuar una tarea a medias

1. `git status` y `git branch`.
2. Leer la sección «En curso» de `ESTADO.md`.
3. Revisar bloqueos y decisiones abiertas.
4. Ejecutar `pnpm check` para confirmar el punto de partida.

## 8. Trabajar con opencode

- Abrir opencode dentro del repositorio; toma `AGENTS.md`.
- El agente lee `ESTADO.md`, trabaja en ramas cortas, ejecuta `pnpm check` y muestra la salida real.
- La compuerta y las pruebas son el revisor. El agente no toca producción ni credenciales.

## 9. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `permission denied` con Docker | Falta el grupo `docker` o reiniciar la sesión |
| `install.sh` dice que existe `.env` | No se sobrescriben secretos; recupera el original |
| `pnpm check` falla en `db:test` | Revisar `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y que PostgreSQL escuche |
| Playwright no encuentra Chromium | `pnpm --filter @axia/web exec playwright install chromium` |
| No se puede iniciar sesión | Ejecutar `pnpm db:reset` y `pnpm db:next:demo -- --demo`; revisar la contraseña de la semilla |
| Puerto 3000 ocupado | Usar `PORT` y `AXIA_API_URL` (Vite reenvía `/api`) |

## 10. Seguridad

- Nunca se suben `.env`, claves, dumps ni datos reales.
- La base local es de desarrollo; los datos demo son ficticios.
- El despliegue real lo ejecuta la persona; ver
  [`migracion/instalacion-autoalojada.md`](migracion/instalacion-autoalojada.md).

## 11. Estado actual

La migración al stack propio está cerrada. El trabajo siguiente es operativo: despliegue real,
respaldos programados y, si se decide, push y escalamiento. Ver [`ESTADO.md`](ESTADO.md).
