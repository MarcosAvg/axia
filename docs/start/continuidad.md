# Continuidad

Guía para retomar el proyecto, actualizar una instalación y resolver problemas frecuentes. La
instalación inicial está en [`instalacion.md`](instalacion.md).

## Actualizar el repositorio

```bash
git pull
pnpm install
```

Si cambió el esquema, reconstruir la base local o ejecutar las migraciones:

```bash
pnpm db:reset          # base local
docker compose run --rm migrate   # instalación con Compose
```

## Retomar una tarea

1. Revisar `git status` y `git branch`.
2. Leer la sección «En curso» de [`../internal/estado.md`](../internal/estado.md).
3. Revisar bloqueos y decisiones abiertas.
4. Ejecutar `pnpm check` para confirmar el estado de partida.

## Volver a clonar

| Elemento | Recuperación |
|---|---|
| `node_modules` | `pnpm install` |
| Base local | `pnpm db:reset` |
| `.env` | `./scripts/install.sh` o recuperar el archivo original |
| Imágenes y navegadores | se descargan por equipo |

La base y `.env` no viajan por Git. El archivo `.env` debe conservarse fuera del repositorio y con
permisos `0600`.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `permission denied` con Docker | Falta el grupo `docker` o no se reinició la sesión |
| `install.sh` detecta un `.env` existente | No se sobrescriben secretos; recuperar el original |
| `pnpm check` falla en `db:test` | Revisar `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y el puerto de PostgreSQL |
| Playwright no encuentra Chromium | `pnpm --filter @axia/web exec playwright install chromium` |
| No se puede iniciar sesión | Ejecutar `pnpm db:reset` y la semilla demo; revisar `AXIA_DEMO_PASSWORD` |
| El puerto 3100 está ocupado | Cambiar `PORT` y `AXIA_API_URL`; Vite reenvía `/api` |
| La API no responde | Revisar `docker compose ps` y `docker compose logs app` |

## Seguridad

- No se versionan `.env`, claves, dumps ni datos reales.
- La base local es de desarrollo; los datos demo son ficticios.
- El despliegue real lo ejecuta la persona; ver [`../guides/operacion.md`](../guides/operacion.md).
