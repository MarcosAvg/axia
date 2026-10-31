# Auditoría de estructura self-hosted

**Fecha:** 2026-10-31. **Estado:** diagnóstico y recomendaciones; no constituye un diseño aprobado.
**Base revisada:** commit `0e76b7c`. No se modificaron scripts, contenedores ni comportamiento.

## Dictamen

Axia tiene una arquitectura adecuada para una aplicación autoalojada pequeña o mediana: un servidor,
una base PostgreSQL y almacenamiento persistente de evidencias. La estructura `apps/web`,
`apps/server`, `deploy` y `docs` se puede conservar. No hay evidencia que justifique una reescritura.

La debilidad principal está en el recorrido operativo: preparar el desarrollo, probar sin perder
datos, publicar una versión coherente, actualizar y recuperar una instalación. Existen protecciones
y pruebas útiles, pero también promesas documentales que los scripts no cumplen. Mejorar esas
garantías aporta más que reorganizar carpetas o incorporar infraestructura adicional.

## Alcance y límites

Se revisaron Compose, Dockerfile, workflows, comandos, instalador, cargadores de entorno, preparación
de pruebas, demo, runner de migraciones, scripts de respaldo/restauración y documentación asociada.
Se consultaron fuentes oficiales de herramientas y proyectos de referencia.

No se leyeron archivos `.env` reales ni claves. No se arrancaron servicios, descargaron imágenes,
ejecutaron migraciones, reiniciaron bases ni tocaron producción. Las comprobaciones de Compose
usaron `--env-file /dev/null` y valores ficticios. No es una auditoría integral del código ni una
certificación de seguridad o rendimiento.

Los hallazgos indican cuándo están comprobados por lectura o mediante una ejecución segura. Los
escenarios de pérdida o incompatibilidad no se provocaron sobre una instancia.

## Qué existe y conviene conservar

| Pieza | Situación actual | Evaluación |
|---|---|---|
| Aplicación y base | Servicios `app` y `db` separados | Correcto |
| Migraciones | Servicio `migrate` que termina; `app` espera su éxito | Correcto para el arranque |
| Web y API | Dos proyectos de desarrollo; un servidor publica ambos en producción | Simple y adecuado |
| Persistencia | Volúmenes diferentes para PostgreSQL y evidencias | Correcto |
| Acceso | Producción sin puertos del host; desarrollo limitado a loopback | Buena base |
| Privilegios | Aplicación con rol sin DDL; migrador con credenciales separadas | Conservar |
| Contenedor | Proceso sin root, capacidades eliminadas y logs con rotación | Conservar |
| Calidad | Tipos, lint, unitarias, navegador y PostgreSQL real | Conservar; cerrar huecos operativos |
| Demo | Semilla explícita, transaccional e idempotente, con rechazo de `NODE_ENV=production` | Conservar y aislar mejor |

Que `migrate` aparezca como terminado con código cero es normal: su trabajo es actualizar la
estructura de la base y salir. No es un servidor que deba permanecer encendido.

El proyecto usa **Drizzle ORM**, no Diesel. Las migraciones actuales son SQL y las ejecuta un runner
propio en [migrate.ts](../../apps/server/src/db/migrate.ts), según
[ADR 0067](../decisions/0067-base-de-datos-autoalojada.md). No se encontró Drizzle Kit instalado ni
un flujo activo de generación con Kit. No son dos motores de migración compitiendo.

## Hallazgos prioritarios

### 1. Las pruebas de navegador no tienen una base obligatoriamente aislada

**Prioridad alta; comprobado por lectura.**

[e2e-server.sh](../../scripts/e2e-server.sh), líneas 6–15, recibe las conexiones generales y llama a
`db:reset`. [reset-db.ts](../../apps/server/scripts/reset-db.ts), líneas 8–12 y 35–38, solo exige un
host local antes de borrar `public` y el historial de migraciones. La plantilla de desarrollo
apunta a la base habitual `axia`. No se impone una base exclusiva de navegador.

Esto permite borrar los datos locales de trabajo al lanzar las pruebas con esa conexión. La guía
de instalación afirma que Playwright prepara su propia base, pero el script no cambia el destino.
En contraste, la integración de servidor sí exige sufijo `_test` en
[helpers.ts](../../apps/server/test/db/helpers.ts), líneas 89–94.

**Recomendación:** destinos explícitos `axia_dev`, `axia_test` y `axia_e2e`, con evidencias separadas;
los comandos automáticos deben rechazar cualquier destino que no sea de pruebas antes de conectar
o borrar. El reinicio deliberado de desarrollo debe ser otro recorrido explícito. El sufijo por sí
solo no sustituye la separación de instancia/credenciales respecto de producción.

### 2. La publicación puede entregar aplicación y migrador de versiones distintas

**Prioridad alta; configuración comprobada, fallo potencial no provocado.**

[publish-images.yml](../../.github/workflows/publish-images.yml), líneas 19–24 y 36–44, publica dos
imágenes mediante trabajos independientes. Ambas actualizan `latest`; Compose consume esos dos
tags mutables en líneas 47 y 59. Un fallo parcial o una descarga durante la publicación puede dejar
una pareja distinta. El workflow de publicación tampoco depende de una compuerta de pruebas del
mismo commit. La existencia de otro workflow de CI no establece esa dependencia.

**Recomendación:** una versión identificable por release y commit, publicada solo tras verificar
ese commit. Como simplificación preferida, una única imagen de Axia usada por dos servicios:
`app` arranca el servidor y `migrate` ejecuta el runner con otro comando y sus propias credenciales.
La imagen actual ya contiene ambos. También sería válido conservar dos imágenes fijadas al mismo
commit; lo esencial es impedir parejas incoherentes y publicar solo artefactos verificados.

Fijar una imagen no basta para volver atrás después de una migración incompatible. La actualización
debe incluir respaldo previo, ventana de mantenimiento o compatibilidad demostrada con la app
anterior, y un procedimiento de recuperación de datos y versión. `depends_on` ordena el arranque;
no garantiza que una app anterior en ejecución deje de atender durante una actualización.

### 3. Los respaldos de base y evidencias no comparten un punto consistente

**Prioridad alta antes de usar datos reales; carrera identificada por lectura.**

[backup.sh](../../deploy/scripts/backup.sh) toma un dump de PostgreSQL y
[backup-evidence.sh](../../deploy/scripts/backup-evidence.sh) recorre después archivos que pueden
seguir cambiando. Ejecutarlos juntos no equivale a tomar una instantánea conjunta.
[process.ts](../../apps/server/src/evidence/process.ts), líneas 114–123, completa una evidencia y
elimina el original: puede ocurrir entre el snapshot de la base y la copia de archivos.

[restore.sh](../../deploy/scripts/restore.sh), líneas 28–32, usa `--clean` sin transacción global ni
salida inmediata al primer error. Una restauración fallida puede haber reemplazado parte de la
base. El código de salida no revierte lo ya aplicado.

**Recomendación:** para el tamaño actual, detener ordenadamente las escrituras y esperar los
trabajos en curso durante el respaldo de ambas partes; identificar el conjunto con un manifiesto
común de fecha, versión, archivos y verificaciones. Restaurar preferentemente en un destino vacío,
preparar roles y base explícitamente, comprobar integridad y usar una transacción de restauración
cuando corresponda. Probar también el fallo de una restauración, no solo el camino exitoso.

No se recomienda introducir snapshots distribuidos o un servicio de backups propio. Los permisos
del directorio del host deben probarse: el backup de evidencias corre como `node`, mientras la ruta
propuesta `/var/backups/axia` puede pertenecer a root. Es un riesgo dependiente del host, no un fallo
reproducido. Los dumps tampoco fijan `umask`; conviene establecer permisos restrictivos.

### 4. Hay opciones documentadas que no llegan a la aplicación en Docker

**Prioridad media; reproducido sin arrancar contenedores.**

[configuracion.md](../reference/configuracion.md), líneas 16–18 y sección de sesiones, indica añadir
opciones al `.env`. Sin embargo, [compose.yaml](../../compose.yaml), líneas 76–94, solo entrega una
lista de variables al proceso. Faltan las de sesiones, límites de login y retención. Definirlas en
el entorno de Compose no las entrega automáticamente al contenedor.

La expansión real de Compose con valores ficticios produjo:

```text
SESSION_IDLE_TTL_HOURS forwarded: false
RETENTION_SESSION_DAYS forwarded: false
```

**Recomendación:** un contrato explícito de configuración, con pruebas que contrasten opciones
documentadas y variables entregadas. Mantener una lista segura para `app`: pasarle todo el archivo
de entorno también le entregaría credenciales del dueño de la base innecesariamente.

### 5. Demo, instalación vacía y desarrollo tienen recorridos confusos

**Prioridad media; comprobado por lectura.**

La ruta local recomendada instala `--demo`, que crea `demo.admin` en
[data.ts](../../apps/server/src/db/seed-demo/data.ts), líneas 30–35. Después,
[install.sh](../../scripts/install.sh), líneas 127–132, indica crear el primer administrador por
`/api/setup`, pero [service.ts](../../apps/server/src/auth/service.ts), líneas 73–82, rechaza setup
si ya hay usuarios. El mensaje de la semilla omite `demo.admin`; ADR 0076 todavía dice que la demo
no crea administradores.

Además, el instalador arranca la API contenedorizada; la alternativa `pnpm dev:api` intenta usar el
mismo puerto. El volumen de evidencias del contenedor y el directorio del proceso local también
son distintos. Falta un procedimiento claro para elegir o cambiar entre esos modos.

**Recomendación:** tres entradas inequívocas: probar con demo, desarrollar con recarga automática e
instalar una instancia vacía. Para desarrollar, preferir PostgreSQL en Docker y web/API en el host;
la demo es una carga opcional sobre una instancia local desechable. El entorno de navegador usa
fixtures controlados y una base propia, aunque reutilice funciones de semilla. No se detectó un
bypass especial de autenticación demo en el recorrido revisado: son cuentas y sesiones normales.

Rechazar `NODE_ENV=production` y hosts remotos es útil, pero `db` o `localhost` también pueden ser
una base real. La ubicación de red no acredita que los datos sean desechables.

### 6. Las pruebas locales seleccionadas omiten cambios de infraestructura

**Prioridad media; selección reproducida interceptando los comandos, sin ejecutarlos.**

[test-affected.mjs](../../scripts/test-affected.mjs), líneas 48–78, considera `.github/` documentación
antes de clasificarlo como estructural y omite Compose en esa clasificación. La selección de
interfaz también omite `src/routes/` en líneas 88–94.

| Archivo simulado | Selección observada |
|---|---|
| `.github/workflows/ci.yml` | Solo `pnpm check:docs` |
| `compose.yaml` | Solo `pnpm check:docs` |
| Pantalla en `src/routes/` | `vitest related`, sin smoke de navegador |

**Recomendación:** corregir y probar la clasificación o simplificarla con un fallback conservador.
No retirar `pnpm check`. La CI de Docker valida sintaxis y construye `app`, pero no arranca el
recorrido completo `db → migrate → app` ni demuestra actualización o restauración.

### 7. Se ofrece personalización de un rol que el SQL fija por nombre

**Prioridad media; inconsistencia comprobada por lectura.**

Compose y la guía admiten `AXIA_APP_USER`. El runner crea ese nombre, pero
[0001_grants.sql](../../apps/server/db/migrations/0001_grants.sql), línea 7 y siguientes, y otras
migraciones conceden permisos a `axia_app` fijo. Otro nombre no funciona en una instalación vacía.

**Recomendación:** mantener fijo el rol interno y retirar la opción hasta necesitarla. Parametrizar
todos los permisos añade complejidad sin un requisito actual. Conservar la separación de roles y
no editar migraciones ya integradas al implementar la corrección.

### 8. Las migraciones propias necesitan controles de evolución, no otra reescritura

**Prioridad media tras los riesgos anteriores; limitación comprobada por lectura.**

El runner tiene bloqueo y transacciones por archivo, pero registra solo nombre y fecha
([migrate.ts](../../apps/server/src/db/migrate.ts), líneas 117–140). No detecta que se haya editado
el contenido de un SQL ya aplicado. Las pruebas verifican muchas propiedades del esquema, pero no
se identificó una compuerta completa de equivalencia entre SQL aplicado y todas las declaraciones
de Drizzle, ni una prueba de actualización desde una release anterior distribuida.

**Recomendación:** huellas de contenido con adopción compatible para instalaciones existentes,
comprobación de cambios a migraciones integradas y pruebas de actualización de versión anterior a
la nueva. Añadir comprobaciones dirigidas de alineación con Drizzle. Conservar el runner por ahora;
cambiar de herramienta solo tendría sentido con un problema y un beneficio medidos.

## Comparación con proyectos de referencia

No existe una estructura de carpetas universal que haga profesional a una aplicación. Las
referencias consultadas difieren en servicios y migraciones; lo transferible son sus recorridos
de instalación y operación. Esta tabla resume prácticas concretas, no una auditoría de esos proyectos.

| Referencia oficial | Práctica observada | Aplicación propuesta a Axia |
|---|---|---|
| [Immich: instalación](https://docs.immich.app/install/docker-compose/) | Distribuye Compose y plantilla de entorno como archivos de release; permite seleccionar versión | Instalar sin Node, pnpm ni checkout del código; paquete de despliegue versionado |
| [Immich: recuperación](https://docs.immich.app/administration/backup-and-restore/) | Distingue base y archivos y describe compatibilidad y recuperación | Tratar una recuperación completa como un recorrido verificable |
| [Paperless-ngx: Compose](https://github.com/paperless-ngx/paperless-ngx/blob/dev/docker/compose/docker-compose.postgres.yml) | Describe servicios, persistencia e instalación desde imágenes | Mantener un Compose pequeño y suficientemente documentado |
| [Paperless-ngx: actualizaciones](https://github.com/paperless-ngx/paperless-ngx/blob/dev/docs/administration.md) | Documenta actualizaciones y fijación de series de versiones | Releases, notas de cambio y decisión explícita de actualización |
| [Outline: Docker](https://docs.getoutline.com/s/hosting/doc/docker-7pfeLP5a8t) | Recomienda versiones fijadas y backup antes de actualizar; documenta migración automática/manual | Controlar qué se instala y el orden de mantenimiento |

Paperless-ngx también usa `latest` en ejemplos. Por tanto, `latest` no es por sí solo prueba de mala
calidad: en Axia el problema concreto es combinar dos tags mutables publicados por separado, sin
una compuerta vinculada y sin recorrido de recuperación probado en CI.

## Base objetivo recomendada

Se recomienda consolidación incremental. La alternativa de reorganizar todo o cambiar de stack
tiene mayor riesgo y no resuelve por sí misma ninguno de los hallazgos anteriores.

| Entorno | Cómo debe funcionar | Aislamiento esperado |
|---|---|---|
| Desarrollo | Un comando prepara PostgreSQL local y arranca API/web con recarga | Base y evidencias de desarrollo |
| Demo | Datos ficticios cargados explícitamente en una instancia desechable | Nunca comparte datos con producción |
| Pruebas | Preparación automática, destino validado y limpieza controlada | Bases y archivos exclusivos de pruebas |
| Producción | Compose e imagen de una release; sin herramientas de desarrollo | Volúmenes y secretos propios |

Conservar `apps/web`, `apps/server`, `deploy` y `docs`. Mantener Compose de producción en la raíz
para facilitar la instalación; documentar un único modo principal de desarrollo y un recorrido de
prueba del contenedor de producción. No crear un archivo Compose por cada pequeña variación: separar
solo los entornos que requieren datos, permisos o ciclo de vida distintos.

La documentación debe distinguir requisitos del **operador** (Docker/Compose y acceso al proxy) de
los del **desarrollador** (Node/pnpm y herramientas). El proxy externo es una opción válida; no hace
falta imponer uno nuevo. Su red, nombres y relación de confianza deben ser explícitos para evitar
colisiones entre instalaciones y acceso desde contenedores ajenos.

## Orden de implementación propuesto

Estas etapas son recomendaciones para un diseño posterior, no cambios realizados ni estimaciones.

| Orden | Trabajo | Condición observable de terminado |
|---|---|---|
| 1 | Aislar pruebas y reinicios | Un E2E conserva intacta una base de desarrollo con datos testigo; destinos indebidos se rechazan antes del borrado |
| 2 | Aclarar desarrollo, demo y configuración | Recorridos vacíos/demo coherentes; recarga de API funcional; variables documentadas efectivas en el proceso |
| 3 | Unificar release e imágenes | Solo se publica el commit verificado; app y migrador comparten versión; instalación limpia desde artefactos |
| 4 | Completar actualización y recuperación | Se restaura base más evidencia en entorno vacío; se verifica recuperación ante error y actualización desde release previa |
| 5 | Automatizar garantías y reducir duplicidad | CI arranca Compose completo; pruebas del selector; guías operativas sin instrucciones contradictorias |

No añadir Kubernetes, microservicios, Redis, un orquestador de monorepo, una CLI extensa ni un
framework de arquitectura solo para parecerse a proyectos mayores. Tampoco quitar comprobaciones
de permisos, historial o idempotencia: responden a requisitos reales de Axia. La complejidad
evitable identificada está en los recorridos y la configuración duplicada, no en necesitar más
servicios.

## Evidencia ejecutada

| Comprobación | Resultado |
|---|---|
| `node --version` / `pnpm --version` / `docker compose version` | `v24.18.0` / `12.8.1` / `v5.6.0` |
| `pnpm test:scripts` con archivo de entorno vacío y temporales del proyecto | Código 0; dry-run, protección de archivo y rutas locales verificadas |
| Compose producción y producción + overlay, `config -q`, con entorno vacío y secretos ficticios | Código 0; configuración sintácticamente válida |
| Inspección JSON de Compose con opciones ficticias de sesión y retención | Ambas ausentes del entorno de `app` |
| Intercepción de `spawnSync` del selector con cambio simulado en workflow | Selecciona solo `check:docs`; no se ejecutó una suite destructiva |

No se ejecutó `pnpm check`, E2E ni integración real: el trabajo es documental, y el recorrido E2E
actual reinicia la base configurada. No se afirma que la aplicación o un despliegue completo hayan
sido verificados por esta revisión. Los chequeos documentales finales se registran en el informe
de entrega y en la memoria del proyecto.

Referencias técnicas consultadas: [Compose: dependencia de tarea terminada](https://github.com/docker/compose/blob/main/pkg/e2e/testdata/TestUpWait/compose.yaml),
[Drizzle: migraciones PostgreSQL](https://orm.drizzle.team/docs/migrations),
[PostgreSQL 17: pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html) y
[PostgreSQL 17: dumps y roles](https://www.postgresql.org/docs/17/backup-dump.html).
