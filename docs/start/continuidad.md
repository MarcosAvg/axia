# Continuidad

Guía para retomar el proyecto, actualizar una instalación y resolver problemas frecuentes. La
instalación inicial está en [`instalacion.md`](instalacion.md).

## Actualizar el repositorio

```bash
git pull
pnpm install
```

Si cambió el esquema, `pnpm dev` aplica las migraciones pendientes sin borrar datos. Un reinicio
intencional de desarrollo exige `pnpm db:reset -- --development` y una base `_dev`; elimina todos
sus datos. No es necesario reiniciar la base para actualizar normalmente.

Una instalación de producción usa imágenes y paquetes de release. La actualización requiere
respaldo previo y parada explícita de la app según la
[guía de operación](../guides/operacion.md); no se actualiza mediante `git pull` ni un tag `latest`.

La migración `0017_remove_retired_objects.sql` retira objetos de importación y métricas sin uso.
Si una tabla histórica contiene filas, la actualización se detiene y conserva el estado anterior.
Realizar el respaldo coordinado y exportar/revisar esas filas con el operador antes de autorizar
su vaciado y reintentar; no eliminar datos solo para forzar el arranque. Una dependencia SQL
inesperada o un bloqueo ocupado también aborta la migración sin aplicarla.

## Retomar una tarea

1. Revisar `git status` y `git branch`.
2. Leer la sección «En curso» de [`../internal/estado.md`](../internal/estado.md).
3. Revisar bloqueos y decisiones abiertas.
4. Ejecutar `pnpm check:fast` para confirmar el estado de partida; reserva `pnpm check` completo
   para el cierre de la tarea.

## Volver a clonar

| Elemento | Recuperación |
|---|---|
| `node_modules` | `pnpm install` |
| Base de desarrollo | Recuperar `.env.dev` y ejecutar `pnpm dev`; para entorno nuevo usar el instalador |
| `.env.dev` | Recuperar el original si existe el volumen; para entorno nuevo usar `./scripts/install.sh` |
| `.env` de producción | Recuperar la configuración original junto con su release; no regenerar sobre datos existentes |
| Imágenes y navegadores | se descargan por equipo |

La base y los archivos `.env`/`.env.dev` no viajan por Git. Conservar los archivos privados fuera del repositorio y con
permisos `0600`.

La prosa exclusivamente histórica se consulta desde el [índice de Git](../history/README.md),
sin restaurarla al checkout como documentación vigente.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `permission denied` con Docker | Falta el grupo `docker` o no se reinició la sesión |
| `install.sh` detecta un `.env.dev` existente | No se sobrescriben secretos; recuperar el original |
| `pnpm check` falla en `db:test` | Iniciar `pnpm test:db:start`; si se cambió el servidor, revisar sus conexiones locales de pruebas |
| Playwright no encuentra Chromium | `pnpm --filter @axia/web exec playwright install chromium` |
| No se puede iniciar sesión | Definir `AXIA_DEMO_PASSWORD` y ejecutar `pnpm db:demo -- --demo` (reaplica la contraseña a los usuarios existentes); revisar el bloqueo por intentos |
| El puerto 3100 está ocupado | Cambiar `PORT` de desarrollo; `pnpm dev` ajusta el proxy de Vite automáticamente |
| La API no responde | En desarrollo revisar el watcher; en producción revisar `docker compose ps` y logs de app |

## Seguridad

- No se versionan `.env`, claves, dumps ni datos reales.
- La base local es de desarrollo; los datos demo son ficticios.
- El despliegue real lo ejecuta la persona; ver [`../guides/operacion.md`](../guides/operacion.md).
