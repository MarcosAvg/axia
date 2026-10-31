# Desarrollo local

Entorno para modificar o probar Axia. La [instalación de una instancia](../../deploy/README.md)
usa imágenes publicadas y tiene otro procedimiento.

## Requisitos

Node.js 24, pnpm 12 (versión fijada en `package.json`), Git, Docker Engine con Compose v2 y
`openssl`. Ejecutar los comandos desde la raíz del repositorio.

## Preparar y arrancar

```bash
pnpm install --frozen-lockfile
./scripts/install.sh
pnpm dev
```

El instalador genera `.env.dev` privado y prepara la base; no inicia HTTP. `pnpm dev` aplica
migraciones y arranca los watchers de API y web en el host; únicamente PostgreSQL corre en
Docker. Abrir `http://localhost:5173`. En una base vacía, `/login` permite crear el primer
administrador. Al terminar los watchers, la base permanece disponible.

| Entorno | Base y proyecto | Puertos predeterminados |
|---|---|---|
| Desarrollo | `axia_dev`, `axia-dev`, volumen persistente | DB `5433`, API `3100`, web `5173` |
| Pruebas | `axia_test` / `axia_e2e`, `axia-test`, tmpfs | DB `55433`, API `3101`, web `5174` |

Las opciones de puerto y rutas están en [configuración](../reference/configuracion.md). Si el
puerto DB está ocupado, elegir otro y ajustar `DB_PORT` y ambas URLs de `.env.dev`, sin modificar
el servicio existente. El instalador no sobrescribe archivos privados ni regenera credenciales
sobre un volumen existente. `./scripts/install.sh --dry-run` solo muestra los pasos.

## Demo local

Para una instalación nueva con datos ficticios, sustituir el paso de instalación por
`./scripts/install.sh --demo`. En un entorno preparado:

```bash
pnpm db:demo -- --demo
```

La semilla crea catálogos, seis tiquets y las cuentas `demo.admin`, `demo.supervisor`,
`demo.technician` y `demo.requester`. Se usa la contraseña comunicada por la semilla; no hay una
contraseña fija ni un acceso especial. La demo no se carga al migrar ni se permite en producción.

`AXIA_DEMO_PASSWORD` definida en el entorno seleccionado reaplica esa contraseña a cuentas demo
existentes. Sin ella, una nueva ejecución conserva las contraseñas ya creadas salvo que se pase
`--reset-passwords`. Reiniciar la API no cambia contraseñas guardadas en la base.

## Pruebas

```bash
pnpm test:db:start
pnpm check:fast
pnpm test:affected
# Antes de integrar:
pnpm check
pnpm test:db:stop
```

Las pruebas no descubren archivos dotenv privados. Usan valores locales ficticios y destinos
validados: loopback, bases `_test`/`_e2e` y sin opciones que puedan sustituir el host. CI puede
exportar los valores de `.env.test.example`. Playwright prepara su base y sus evidencias; no
reutiliza la base de desarrollo. Ejecutar suites de navegador y regresión visual por separado.
Evitar crear o retirar redes Docker mientras se ejecutan flujos de navegador.

El [catálogo de comandos](../reference/comandos.md) explica los subconjuntos y el smoke de imagen.
Las pruebas deben cubrir cambios reales; no se añaden pruebas de texto para documentación.

## Retomar o actualizar

1. Revisar `git status`, rama y [estado de trabajo](../internal/estado.md).
2. Actualizar el checkout sin sobrescribir trabajo local e instalar el bloqueo de dependencias
   con `pnpm install --frozen-lockfile`.
3. Leer la especificación si se toca negocio y ejecutar `pnpm check:fast`.
4. Arrancar `pnpm dev`; las migraciones pendientes se aplican sin reiniciar la base.

Las migraciones aplicadas son inmutables y se comprueban con SHA-256. Si la migración 0017 detecta
filas en tablas históricas o dependencias inesperadas, aborta sin retirarlas: revisar/exportar esos
datos antes de reintentar. La [operación de producción](../guides/operacion.md) se hace con releases,
respaldos y una ventana de mantenimiento; no mediante el flujo de desarrollo.

Solo para descartar deliberadamente una base local `_dev`:

```bash
pnpm db:reset -- --development
```

El comando borra los datos de esa base. No se utiliza para actualizar normalmente.

## Resolver problemas locales

| Síntoma | Acción |
|---|---|
| Falta `.env.dev` pero existe el volumen | Recuperar la configuración original; no regenerar secretos sobre esos datos |
| El instalador falló después de crear `.env.dev` | Conservarlo y reintentar la preparación con `pnpm dev` |
| `permission denied` con Docker | Revisar acceso del usuario al daemon y reiniciar sesión si cambió su grupo |
| `db:test` no conecta | Iniciar `pnpm test:db:start`; revisar las conexiones ficticias si cambió el puerto |
| Playwright no encuentra Chromium | Ejecutar `pnpm --filter @axia/web exec playwright install chromium` |
| La demo no admite la contraseña esperada | Reaplicarla con `AXIA_DEMO_PASSWORD` y la semilla; revisar bloqueo de login |
| Un puerto HTTP está ocupado | Configurar `PORT` o `AXIA_DEV_WEB_PORT`; la API se comunica al proxy de Vite |

Las bases y los archivos privados no viajan por Git. Conservarlos fuera del repositorio con
permisos restrictivos. Un entorno anterior que use `.env` no se convierte automáticamente en
`.env.dev`: conservar su configuración y realizar cualquier transferencia de datos por respaldo
y recuperación deliberados en un destino nuevo.
