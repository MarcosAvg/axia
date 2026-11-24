# Operación de una instancia

Procedimientos para una instancia instalada desde un paquete de release. Ejecutar los comandos
desde su directorio. Para instalar, configurar TLS y crear el primer administrador, consultar
[Instalación](../../deploy/README.md). Los ajustes y valores predeterminados están en
[Configuración](../reference/configuracion.md).

## Actualización

1. Revisar las notas y la versión de origen probada para la release destino. Verificar el checksum
   de su paquete y conservar el paquete anterior y la configuración privada. Anotar el proyecto
   Compose, los volúmenes y el digest instalado.
2. Hacer el diagnóstico de la instancia y comprobar que haya espacio suficiente para la nueva
   imagen y el respaldo. Bloquear el acceso de usuarios en el proxy y pausar tareas escritoras
   externas. Mantener la pausa durante toda la ventana, incluso cuando el respaldo reinicie la app.
3. Ejecutar un respaldo coordinado sobre la imagen **instalada**, antes de descargar la imagen
   destino. Guardar el conjunto fuera del host y verificar allí los dos hashes del manifiesto.
4. Revisar los cambios del Compose y de la plantilla del paquete destino. Aplicar esos cambios
   conservando el proyecto, los volúmenes y los secretos. Fijar `AXIA_IMAGE` al digest
   destino para instancias con datos reales. Descargar la imagen y arrancar. Compose recrea
   `app` y las migraciones se aplican antes de que escuche en `3100`.
5. Con acceso de mantenimiento, verificar salud desde HTTPS, inicio de sesión, un tiquet existente
   y su evidencia. Reabrir el tráfico y reanudar las tareas después de validar esos resultados.

### Respaldar la versión instalada

Ejecutar desde el directorio de la instancia, con su configuración actual.

```bash
./deploy/scripts/backup-all.sh
```

Si la versión instalada es anterior a `v0.32.0`, usar el script del paquete nuevo para obtener
el manifiesto con digest. En este ejemplo, el paquete nuevo está en `/opt/axia-nueva` y la
instancia usa la configuración predeterminada del paquete en `/opt/axia`. Si se eligió un
nombre de proyecto distinto, conservarlo en `COMPOSE_PROJECT_NAME`.

```bash
cd /opt/axia
AXIA_COMPOSE_FILE=/opt/axia/compose.yaml \
  AXIA_ENV_FILE=/opt/axia/.env \
  /opt/axia-nueva/deploy/scripts/backup-all.sh
```

### Aplicar la versión destino

Después de verificar el respaldo fuera del host y aplicar la configuración de la versión destino,
ejecutar desde el directorio de la instancia.

```bash
docker compose pull app &&
  docker compose up -d --wait
docker compose logs --tail=100 app
```

Si la migración falla, la app no arranca; conservar los logs y recuperar el conjunto anterior en
otro destino vacío si corresponde. Cambiar solo la etiqueta no revierte una migración.
Si la versión nueva ya recibió escrituras, conservar también sus datos y coordinar cómo recuperar
esos cambios antes de conmutar el proxy a la instancia restaurada.

### Si una migración se detiene

Mantener app parada y revisar el error completo; no borrar datos ni editar el historial de
migraciones para forzar el arranque. Las migraciones de retirada
`0017_remove_retired_objects.sql` y `0031_remove_external_refs.sql` retiran objetos históricos sin
consumidores: si alguna tabla contiene filas, conservan el estado anterior y abortan. Conservar el
conjunto de respaldo previo y exportar/revisar esas filas con el operador antes de autorizar su
vaciado y reintentar. Una dependencia SQL inesperada o un bloqueo ocupado también aborta la
migración sin aplicarla. Véase [Datos](../concepts/datos.md).

## Respaldos y recuperación

### Conjunto consistente

Para respaldos reproducibles, fijar `AXIA_IMAGE` al digest de la release. El manifiesto de
formato 2 conserva el digest descargable incluso si la instancia usa el canal `latest`. Mantener
la referencia durante todo el respaldo. El script la obtiene de la configuración de Compose.

```bash
# AXIA_IMAGE en el archivo de entorno ya selecciona la release instalada.
BACKUP_DIR=/var/backups/axia ./deploy/scripts/backup-all.sh
```

`backup-all.sh` rechaza trabajos operativos one-off activos, detiene `app` y comprueba que terminó
con código cero. Si el apagado agotó su plazo o Docker tuvo que matarla, aborta sin respaldar.
Con la aplicación detenida, copia PostgreSQL con `pg_dump -Fc` y el volumen de evidencias. El
contenedor auxiliar usa el usuario de la imagen que posee las evidencias; el host escribe archivos
`0600`, dentro de un directorio `0700`, sin depender del UID de la imagen.

| Archivo | Contenido |
|---|---|
| `database.dump` | Volcado de PostgreSQL en formato personalizado |
| `evidence.tgz` | Volumen de evidencias y adjuntos |
| `manifest` | Formato, fecha UTC, referencia e ID local de la imagen, digest descargable si existe y hashes SHA-256 de ambos archivos |

Los conjuntos de imágenes locales sin digest usan el formato 1. Conservar también esas imágenes
para recuperar en otro host. Los hashes permiten detectar corrupción. Restaurar solo conjuntos
que hayan permanecido bajo control del operador.

El script publica el conjunto completo al terminar ambas copias y elimina el directorio
`.incomplete-` si hay un fallo. Vuelve a arrancar `app` si estaba activa al iniciar. La retención
de conjuntos completos se programa por separado, después de probar una recuperación.

Excluir otros trabajos, escritores externos y operaciones de Docker sobre esa instancia
mientras se respalda o restaura. Los scripts rechazan trabajos one-off que ya están activos; la
ventana operativa debe excluir también el arranque concurrente de otros trabajos.

### Restaurar en un destino vacío

Recuperar en otro proyecto Compose, con base y volumen de evidencias nuevos. El script rechaza una
base con objetos de usuario o un volumen con cualquier archivo; no mezcla datos ni elimina datos
anteriores. Conservar la instancia anterior hasta validar la recuperada.

Desde el directorio del paquete del destino, preparar un archivo de entorno propio. Configurar los
secretos, el alias del proxy y `AXIA_IMAGE`. Usar `image_digest` del manifiesto para un respaldo
de formato 2. Para el formato 1, seleccionar la referencia original y el mismo ID local.

```bash
export COMPOSE_PROJECT_NAME=axia_recovery
export AXIA_ENV_FILE=/opt/axia-recovery/instance.env
backup_set=/var/backups/axia/axia-20261120T151931Z-ejemplo

# Sustituir backup_set por el conjunto real. Descargar app si procede de un registro.
docker compose --env-file "$AXIA_ENV_FILE" pull app &&
  ./deploy/scripts/restore-all.sh "$backup_set" &&
  docker compose --env-file "$AXIA_ENV_FILE" up -d --wait app
```

Para una imagen local, cargar la imagen conservada y comenzar la secuencia en
`./deploy/scripts/restore-all.sh`, manteniendo el `&&` antes del arranque.

`restore-all.sh` valida la imagen y los hashes antes de detener `app`. Luego
espera a `db`, comprueba que los destinos estén vacíos y ejecuta las migraciones de la imagen
original para preparar roles, esquemas y permisos. Un error de `pg_restore` revierte la
restauración del volcado. El esquema creado por las migraciones puede permanecer.

Por último extrae las evidencias como el usuario de la imagen, con `--no-same-owner`: los archivos
quedan bajo el propietario efectivo de la aplicación sin requerir root ni capacidades adicionales.
Si falla la recuperación de base o archivos, mantener el destino fuera del proxy y la aplicación
detenida. Conservar el conjunto y reintentar en otro proyecto con volúmenes nuevos. En un destino
vacío, arrancar `app` con el último comando del ejemplo únicamente si termina la restauración.

Verificar salud, inicio de sesión, conteos de tiquets, eventos y evidencias, y abrir un archivo de
evidencia antes de cambiar el proxy al destino recuperado. Usar este mismo procedimiento para
volver a la versión anterior después de una actualización fallida.

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

Se puede programar una copia coordinada a un directorio montado fuera del host. Confirmar el montaje
antes de escribir para evitar respaldar por accidente en el disco local. Este ejemplo supone que
`/mnt/backups` es un montaje administrado por el operador. Programar la copia en una ventana
distinta a la limpieza y comprobar el resultado del trabajo.

```cron
0 2 * * * mountpoint -q /mnt/backups && cd /opt/axia && BACKUP_DIR=/mnt/backups/axia ./deploy/scripts/backup-all.sh
```

## Salud y diagnóstico

Desde el directorio de la instancia, ejecutar el diagnóstico con el dominio y el destino de
respaldos del operador. Requiere `curl` y GNU `date`. Devuelve código distinto de cero si falla el
HTTPS público, la preparación interna de la app, la escritura de una sonda temporal como usuario de
la app, el espacio libre o la presencia de un conjunto reciente. El diagnóstico de antigüedad
comprueba que estén el manifiesto y ambos archivos. El simulacro de restauración verifica su integridad.

```bash
AXIA_PUBLIC_URL=https://axia.example.org BACKUP_DIR=/mnt/backups/axia ./deploy/scripts/check-instance.sh
```

Ejecutar el diagnóstico periódicamente desde el host con la cuenta de operación y enviar un
resultado distinto de cero al sistema de alertas del operador. Ajustar los umbrales en la
[referencia de configuración](../reference/configuracion.md#herramientas-operativas).

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

Revisar salud, logs y espacio tanto en los volúmenes como en el destino de respaldos. Si falla la
migración de arranque, conservar la salida de `docker compose logs app`; el contenedor no llega a
escuchar en `3100`. Para lentitud o saturación de conexiones, consultar
[Rendimiento de PostgreSQL](../reference/rendimiento-postgres.md).

## Registro del simulacro

En un host Linux de laboratorio, registrar versiones de origen y destino, digest, versión de Compose
y destino elegido. Medir por separado la ventana entre retirar el tráfico y volver a habilitarlo,
y el tiempo de restaurar y validar en un proyecto vacío. Anotar login, conteos de tiquets y eventos,
integridad de evidencias y adjuntos, continuidad de SSE y las alertas provocadas. Repetir el
simulacro antes de admitir datos reales y después con la periodicidad acordada con el operador.
El registro del primer ensayo local se puede recuperar desde el
[índice histórico](../history/README.md).

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
