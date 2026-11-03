# 0099 — Entornos y operación self-hosted reproducibles

**Fecha:** 2026-10-31
**Estado:** aceptada
**Sustituida parcialmente por:** [0110](0110-latest-y-migracion-en-arranque.md)

## Contexto

La auditoría de estructura detectó recorridos incoherentes de desarrollo, demo, pruebas,
publicación y recuperación. No es necesario sustituir el stack ni distribuir el servidor en más
servicios. Se requiere que cada entorno tenga datos propios y que el artefacto instalado sea
identificable y recuperable.

## Decisión

1. **Desarrollo independiente:** `compose.dev.yaml` es autónomo, proyecto `axia-dev` y base
   `axia_dev`. Solo PostgreSQL corre en Docker; `pnpm dev` prepara migraciones y arranca los dos
   watchers del host. El instalador prepara `.env.dev`, no inicia una segunda API contenedorizada.
   El archivo `.env` se reserva para el operador de producción.
2. **Pruebas desechables:** `compose.test.yaml` usa tmpfs y puerto `55433`. Integración usa una base
   `_test`, navegador una `_e2e`, API `3101` y Vite `5174`. Las conexiones se validan antes de abrirlas:
   loopback, nombre restringido y sin parámetros que puedan sustituir el host. Las pruebas no
   descubren archivos dotenv privados. El reset de desarrollo exige `--development` y base `_dev`.
3. **Demo explícita:** conserva las sesiones y permisos normales; enumera también `demo.admin`.
   El instalador distingue una demo con administrador de una instalación vacía con setup pendiente.
4. **Una imagen por release:** `app` y `migrate` usan `AXIA_IMAGE`, con comandos y credenciales
   diferentes. Se conserva el nombre de imagen `axia-app` y se retira la publicación independiente
   de `axia-migrate`. Producción exige elegir imagen; el paquete publicado fija su digest. Publicar
   requiere la CI completa del mismo commit y distribuye Compose, plantilla y scripts operativos,
   sin Node/pnpm ni código de aplicación en el host. El build actual es para la arquitectura del
   runner Linux x86-64; ARM no se anuncia como soportado.
5. **Configuración explícita:** Compose entrega opciones de sesiones, login y retención además de
   las anteriores, sin entregar credenciales de migración a `app`. El rol interno es `axia_app`:
   los grants históricos ya lo fijaban; solicitar otro nombre falla antes de consultar la base.
6. **Red del operador:** `proxy` es externa. El operador la crea o reutiliza y conecta su proxy;
   `AXIA_PROXY_NETWORK` y `AXIA_PROXY_ALIAS` evitan colisiones entre instancias. La app no publica
   puertos en producción y conserva su relación de confianza con ese proxy.
7. **Recuperación coordinada:** `backup-all.sh` detiene limpiamente la app mientras copia base y
   archivos, rechaza tareas operativas activas y produce un conjunto privado con hashes y versión.
   Reactiva solo una app originalmente activa. `restore-all.sh` exige destino vacío, prepara roles
   con la misma imagen y restaura PostgreSQL en una transacción. Ante un fallo no publica la app;
   se recupera en otro destino vacío. Las copias se guardan fuera del host según la política del
   operador; un conjunto local no sustituye esa política.
8. **Integridad del historial:** `0016_migration_history.sql` añade hashes al metadato del runner.
   Se aplica al preparar un historial antiguo sin esa columna y se registra también en el orden
   habitual. Si la columna ya existe no se vuelve a ejecutar: primero se verifica el hash. El historial antiguo sin hash se adopta
   una vez desde los SQL distribuidos; no se puede demostrar retroactivamente que nunca fueron
   modificados. Después se rechazan archivos cambiados o ausentes antes de ejecutar SQL pendiente.
9. **Pruebas de navegador en serie:** las specs comparten catálogos, usuarios y base; se retira la
   concurrencia entre specs hasta que existan fixtures independientes por worker. No se eliminan
   aserciones ni se añaden reintentos locales para ocultar interferencias.
10. **Selección conservadora:** infraestructura, workflows, lockfile, borrados y cambios desconocidos
    llevan a la compuerta completa; rutas UI y estilos incluyen smoke. El script se prueba con
    procesos interceptados. CI arranca el Compose real y verifica instalación, actualización del
    historial previo a hashes y recuperación sobre volúmenes nuevos.

## Consecuencias

- Los datos de la instalación local antigua no se migran ni se borran automáticamente. El cambio
  de `.env` a `.env.dev`, proyectos y bases requiere preparar el entorno nuevo o una transferencia
  deliberada de datos con respaldo.
- El mantenimiento necesita una ventana breve sin escrituras ni tareas operativas concurrentes.
  Base y archivos no tienen transacción distribuida; la recuperación fallida conserva la app
  detenida. El rollback usa una copia y su imagen, no solo cambiar un tag.
- Los archivos de configuración, Compose y guías tienen pruebas de contrato; no se añade un
  generador de configuración ni una CLI operativa extensa.
- Se conserva el runner SQL propio y las garantías de permisos del servidor. La migración nueva
  solo cambia metadatos privados del migrador, no tablas del negocio ni permisos de la app.
- Se sustituyen los recorridos operativos de ADR 0075 y se precisa la demo de ADR 0076; ambos
  originales se consultan en el [historial Git](../history/README.md). Los procedimientos actuales
  están en [instalación](../../deploy/README.md) y [desarrollo](../start/desarrollo.md).

## Alternativas descartadas

- Reescribir el stack o reorganizar carpetas: no resuelve el riesgo operativo observado.
- Dos imágenes con `latest` independientes: permiten mezclar versiones.
- Pasar todo el archivo de entorno a la app: entrega secretos innecesarios.
- Respaldar archivos y base con escrituras activas sin coordinación: no garantiza conjunto coherente.
- Restaurar encima de datos existentes: amplía el riesgo y dificulta recuperar el intento fallido.
- Añadir Kubernetes, Redis, snapshots distribuidos o un framework de monorepo sin una necesidad medida.
