# Operación de una instancia

Procedimientos para una instancia instalada desde un paquete de release. Ejecutar los comandos
desde su directorio. Para instalar, configurar TLS y crear el primer administrador, consultar
[Instalación](../../deploy/README.md). Los ajustes y valores predeterminados están en
[Configuración](../reference/configuracion.md).

## Actualización

1. Revisar las notas de la release destino y reservar una ventana sin escritores ni tareas
   operativas concurrentes. Conservar el paquete y la configuración de la instancia.
2. Ejecutar un conjunto de respaldo sobre la imagen instalada.
3. Guardar el conjunto fuera del host. Con el canal `latest` no hace falta editar `.env`; para
   fijar una release, definir `AXIA_IMAGE` con una etiqueta `vX.Y.Z` o el digest de `release.json`.
4. Descargar la imagen y arrancar. Compose detiene y recrea `app`; el contenedor aplica las
   migraciones pendientes antes de escuchar en `3100`.
5. Verificar salud, login y una evidencia antes de terminar el mantenimiento.

```bash
./deploy/scripts/backup-all.sh
docker compose pull
docker compose up -d --wait
docker compose logs --tail=100 app
```

Si la migración falla, la app no arranca; conservar los logs y recuperar el conjunto anterior en
otro destino vacío si corresponde. Cambiar solo la etiqueta no revierte una migración.

### Si una migración se detiene

Mantener app parada y revisar el error completo; no borrar datos ni editar el historial de
migraciones para forzar el arranque. La migración `0017_remove_retired_objects.sql` retira objetos
históricos sin consumidores: si alguna tabla contiene filas, conserva el estado anterior y aborta.
Conservar el conjunto de respaldo previo y exportar/revisar esas filas con el operador antes de
autorizar su vaciado y reintentar. Una dependencia SQL inesperada o un bloqueo ocupado también aborta la
migración sin aplicarla. Véase [Datos](../concepts/datos.md).

## Respaldos y recuperación

### Conjunto consistente

Para respaldos reproducibles, fijar `AXIA_IMAGE` en una etiqueta `vX.Y.Z` o en un digest. Con el
canal `latest`, el manifiesto conserva la referencia usada y el ID local de la imagen. Mantener la
referencia durante todo el respaldo. No hace falta exportarla al shell: los scripts obtienen la
imagen de la configuración de Compose sin imprimir la configuración completa, que contiene secretos.

```bash
# AXIA_IMAGE en el archivo de entorno ya selecciona la release instalada.
BACKUP_DIR=/var/backups/axia ./deploy/scripts/backup-all.sh
```

`backup-all.sh` rechaza trabajos operativos one-off activos, detiene `app` y comprueba que terminó
con código cero. Si el apagado agotó su plazo o Docker tuvo que matarla, aborta sin respaldar.
Con la aplicación detenida, copia PostgreSQL con `pg_dump -Fc` y el volumen de evidencias. El
contenedor auxiliar usa el usuario de la imagen que posee las evidencias; el host escribe archivos
`0600`, dentro de un directorio `0700`, sin depender del UID de la imagen.

Cada conjunto contiene `database.dump`, `evidence.tgz` y `manifest`: formato, fecha UTC, referencia e
ID local inmutable de la imagen y SHA-256 de ambos archivos. El manifiesto detecta corrupción; no es
una firma de autenticidad. Restaurar solo conjuntos de Axia conservados bajo control del operador;
no sustituir sus tar por archivos de terceros. El directorio temporal empieza por
`.incomplete-`; solo se renombra y recibe manifiesto al completar ambas copias. Ante un fallo se
elimina exclusivamente ese temporal. El script vuelve a arrancar `app` solo si estaba activa al
iniciar, tanto en éxito como en fallo. No borra conjuntos anteriores automáticamente: programar la
retención sobre conjuntos completos después de verificar una recuperación.

Excluir otros trabajos, escritores externos y operaciones de Docker sobre esa instancia
mientras se respalda o restaura. Los scripts rechazan trabajos one-off que ya están activos; la
ventana operativa debe excluir también el arranque concurrente de otros trabajos.

### Restaurar en un destino vacío

Recuperar en otro proyecto Compose, con base y volumen de evidencias nuevos. El script rechaza una
base con objetos de usuario o un volumen con cualquier archivo; no mezcla datos ni elimina datos
anteriores. Conservar la instancia anterior hasta validar la recuperada.

```bash
# Configurar los secretos del destino y AXIA_IMAGE con la release o el ID del manifiesto.
# Este ejemplo utiliza un archivo de entorno propio, sin leerlo desde el shell.
export COMPOSE_PROJECT_NAME=axia_recovery
export AXIA_ENV_FILE=/opt/axia-recovery/instance.env
./deploy/scripts/restore-all.sh /var/backups/axia/axia-<fecha>-<id>
docker compose --env-file "$AXIA_ENV_FILE" up -d app
```

La imagen local debe coincidir tanto en referencia como en ID con el manifiesto; descargarla antes
con Compose si hace falta. `restore-all.sh` valida los archivos y sus hashes antes de detener app.
Arranca y espera `db`, valida que ambos destinos estén vacíos y ejecuta la migración de esa misma
imagen para preparar el rol interno, los esquemas y permisos en un host vacío. Después restaura la
base con `pg_restore --single-transaction --exit-on-error --clean --if-exists --no-owner`: un error
revierte toda la transacción de restauración. El esquema inicial de la migración puede permanecer,
pero no una carga parcial del dump.

Por último extrae las evidencias como el usuario de la imagen, con `--no-same-owner`: los archivos
quedan bajo el propietario efectivo de la aplicación sin requerir root ni capacidades adicionales.
La base y los archivos no forman una transacción distribuida: si falla cualquier paso, **app queda
detenida**. No se debe publicar ese
destino. Conservar el conjunto y reintentar en un proyecto con volúmenes nuevos; el script no limpia
automáticamente un intento fallido. En éxito solo reinicia una app que estaba activa originalmente;
en un host vacío arrancarla explícitamente con el comando anterior.

Verificar salud, login, conteos de tiquets, eventos y evidencias, y abrir un archivo de evidencia antes
de cambiar el proxy al destino recuperado. Esta ruta también sirve para volver a una versión
anterior: restaurar su conjunto y su imagen en un proyecto nuevo, validar y después cambiar el
proxy. Cambiar únicamente el tag no revierte una migración.

El Compose de producción comparte por defecto la red/alias del proxy; al probar otra instancia en
el mismo host, configurar red y alias propios antes de arrancarla para evitar colisiones. La prueba
de recuperación debe realizarse al instalar y después cada trimestre.

### Automatización

Los scripts aceptan un entorno y un Compose alternativos, además de un proyecto separado; consultar
las variables de [Herramientas operativas](../reference/configuracion.md#herramientas-operativas).
Las rutas relativas de esas opciones se resuelven desde la raíz de la instalación. El proyecto
seleccionado determina los volúmenes. No ejecutar limpieza, migraciones u otros trabajos mientras
se respalda o recupera esa misma instancia.

### Scripts individuales

Se conservan `backup.sh`, `backup-evidence.sh`, `restore.sh` y `restore-evidence.sh` para operaciones
puntuales. Las copias individuales **no garantizan consistencia entre base y archivos**: utilizar el
coordinador para recuperación completa. Los backups individuales usan temporales privados y solo
aplican `RETENTION_DAYS` después de terminar correctamente.

La [referencia de configuración](../reference/configuracion.md#herramientas-operativas) recoge sus
opciones. `restore.sh` es transaccional, pero usa `--clean`: puede reemplazar objetos existentes y
**no comprueba que la base esté vacía**. Preparar roles, detener escritores y comprobar el destino
corresponde al operador. Para recuperar una instancia completa, usar `restore-all.sh`.
La restauración individual de evidencias exige app detenida y un volumen vacío; el script comprueba
el volumen vacío, pero la parada corresponde al operador.

## Limpieza y retención

Una subida que nunca termina deja un archivo parcial en el volumen. La cuota se comprueba al iniciar
la subida, y este trabajo elimina los archivos parciales que superan el umbral configurado y marca la fila como
`failed`; las filas de evidencia nunca se borran (RN-22).

La retención borra sesiones caducadas o revocadas, intentos de acceso y avisos ya leídos. Los avisos
sin leer y la bitácora de tiquets se conservan.

```bash
# Con la pila levantada y sin respaldo ni recuperación concurrentes:
./deploy/scripts/cleanup.sh
```

Los umbrales se consultan en [Configuración](../reference/configuracion.md#limpieza). Programar la
limpieza y los respaldos en ventanas separadas; por ejemplo, para la limpieza diaria:

```cron
0 3 * * * cd /opt/axia && ./deploy/scripts/cleanup.sh >> /var/log/axia-cleanup.log 2>&1
```

La retención de conjuntos completos de respaldo se programa por separado: `backup-all.sh` no borra
conjuntos antiguos. Conservar copias fuera del host y verificar una recuperación antes de eliminar
las anteriores.

## Salud y diagnóstico

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

Revisar salud, logs y espacio tanto en los volúmenes como en el destino de respaldos. Si falla la
migración de arranque, conservar la salida de `docker compose logs app`; el contenedor no llega a
escuchar en `3100`. Para lentitud o saturación de conexiones, consultar
[Rendimiento de PostgreSQL](../reference/rendimiento-postgres.md).

## Secretos y rotación

Mantener el archivo de entorno fuera de Git y con permisos `0600`; proteger también dumps y
evidencias. Recuperar la configuración original si ya existen volúmenes: no generar secretos nuevos
sobre una base existente.

Editar una contraseña en el archivo de entorno **no cambia la contraseña de un rol ya creado**.
Las contraseñas de `axia_owner` (o el dueño configurado) y `axia_app` deben cambiarse también en
PostgreSQL mediante una sesión administrativa segura (`ALTER ROLE`). La migración de arranque crea
el rol de aplicación si falta; no rota su contraseña cuando ya existe. Planificar una ventana sin escritores,
conservar un respaldo y coordinar cambio de rol, configuración y recreación de los servicios afectados; un simple `restart` no
incorpora cambios en el entorno del contenedor. No poner contraseñas en comandos, logs o historial
del shell. Verificar migración, salud y login después del cambio.
