# Desarrollo local

Entorno para modificar o probar Axia. La [instalación de una instancia](../../deploy/README.md)
usa imágenes publicadas y tiene otro procedimiento.

## Requisitos

- Node.js 24 y la versión de pnpm fijada en el campo `packageManager` de `package.json`.
- Git, Docker Engine con el plugin de Docker Compose v2 o posterior y `openssl`.
- Chromium de Playwright para las pruebas de navegador.

Ejecutar los comandos desde la raíz del repositorio.

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

La semilla crea catálogos, 240 tiquets repartidos en doce meses y las cuentas `demo.admin`,
`demo.supervisor`, `demo.technician` y `demo.requester`. Se usa la contraseña comunicada por la
semilla; no hay una contraseña fija ni un acceso especial. La demo no se carga al migrar ni se
permite en producción.

El conjunto incluye los seis escenarios curados y un volumen generado de forma determinista para
que el tablero de métricas tenga datos en todas sus pestañas: todos los estados, antigüedades de
0–1 a más de 30 días, tiempos dentro y fuera de SLA, calificaciones, pausas con subestados,
rechazos, cancelaciones, duplicados, reasignaciones, recapturas y reaperturas. La evidencia WebP
ficticia se genera solo para una muestra de tiquets, de modo que el detalle siga siendo
demostrable sin ralentizar la carga.

`AXIA_DEMO_PASSWORD` definida en el entorno seleccionado reaplica esa contraseña a cuentas demo
existentes. Sin ella, una nueva ejecución conserva las contraseñas ya creadas salvo que se pase
`--reset-passwords`. Reiniciar la API no cambia contraseñas guardadas en la base.

Los escenarios incluyen ofertas, evidencias WebP ficticias rotuladas DEMO y validaciones
coherentes con su estado. El comando local y la API comparten `AXIA_DEV_STORAGE_DIR` o, si no está
definida, `apps/server/data/evidence`. Las pruebas usan su propio `STORAGE_DIR`. Reaplicar la
semilla recupera ofertas ausentes de tiquets demo aún registrados y sin actividad, y agrega los
tiquets generados que falten; no reescribe los ya operados ni agrega retrospectivamente evidencias
a escenarios antiguos. Para ver la demo completa desde cero conviene `pnpm db:reset` antes de
volver a sembrar; no reiniciar una base con trabajo que deba conservarse.

## Pruebas

```bash
pnpm check:fast
pnpm --filter @axia/web exec playwright install chromium
pnpm test:db:start
pnpm test:affected
# Antes de integrar:
pnpm check
pnpm test:db:stop
```

Las pruebas usan valores ficticios y destinos de loopback validados. Playwright prepara
`axia_e2e` y su propio almacenamiento de evidencias. Las pruebas de integración usan
`axia_test`. `check:fast` se ejecuta sin contenedor. `test:affected` puede seleccionar suites
de navegador o la compuerta completa, que requieren el PostgreSQL de pruebas. Ejecutar en
secuencia las suites que reconstruyen la misma base. Para consultar el efecto de cada script,
ver [Comandos](../reference/comandos.md).

Si Chromium reporta bibliotecas de sistema faltantes en Linux, preparar las dependencias del
host. CI usa `pnpm --filter @axia/web exec playwright install chromium --with-deps`.
Ejecutar Playwright y la regresión visual por separado para aislar sus datos y puertos.

El [catálogo de comandos](../reference/comandos.md) explica los subconjuntos y el smoke de imagen.
Las pruebas deben cubrir cambios reales; no se añaden pruebas de texto para documentación.

## Retomar o actualizar

1. Revisar `git status`, la rama y el [CHANGELOG](../../CHANGELOG.md); los límites vigentes están
   en [límites y pendientes](../reference/limitaciones.md).
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

## Auditar tiempos

`pnpm db:audit:time --limit 20` revisa, sin escribir en la base:

- cobertura de fases distinta de cero;
- duraciones negativas en participaciones, pausas, pasos y asignaciones;
- eventos fuera de los límites del tiquet y desfase entre acción y registro;
- pausas cuya suma de tramos no coincide con sus pasos;
- evidencias con ciclo incoherente;
- eventos `unverified` y alertas de tiempo abiertas.

Una alerta abierta bloquea `validate`, `reject`, `cancel`, `mark_duplicate` y `resolve_claim`
hasta que una persona con permiso corrija la hora. La corrección se hace desde el detalle del
tiquet y queda auditada. Después de corregir, vuelve a ejecutar la auditoría: los desfases
históricos se reportan, no se ocultan ni se reescriben.

## Reapertura de la PWA sin conexión

Con el PostgreSQL local de pruebas iniciado mediante `pnpm test:db:start`, ejecuta el escenario
offline con la compilación de producción y el service worker activado.

```bash
AXIA_E2E_PWA=1 pnpm --filter @axia/web exec playwright test e2e/offline.spec.ts
```

## Resolver problemas locales

| Síntoma | Acción |
|---|---|
| Falta `.env.dev` pero existe el volumen | Recuperar la configuración original; no regenerar secretos sobre esos datos |
| El instalador falló después de crear `.env.dev` | Conservarlo y reintentar la preparación con `pnpm dev` |
| `permission denied` con Docker | Revisar acceso del usuario al daemon y reiniciar sesión si cambió su grupo |
| `db:test` no conecta | Iniciar `pnpm test:db:start`; revisar las conexiones ficticias si cambió el puerto |
| Playwright no encuentra Chromium | Ejecutar `pnpm --filter @axia/web exec playwright install chromium` |
| La demo no admite la contraseña esperada | Reaplicarla con `AXIA_DEMO_PASSWORD` y la semilla; revisar bloqueo de login |
| Un puerto HTTP está ocupado | Identificar el servicio que usa el puerto y detenerlo mediante su gestor de procesos, o cambiar `PORT` para la API o `AXIA_DEV_WEB_PORT` para Vite |

Las bases y los archivos privados no viajan por Git. Conservarlos fuera del repositorio con
permisos restrictivos. Un entorno anterior que use `.env` no se convierte automáticamente en
`.env.dev`: conservar su configuración y realizar cualquier transferencia de datos por respaldo
y recuperación deliberados en un destino nuevo.
