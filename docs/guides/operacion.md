# Operación

Guía para desplegar, actualizar y respaldar una instalación de Axia. La instalación inicial está en
[`../start/instalacion.md`](../start/instalacion.md).

## Arquitectura de despliegue

| Servicio | Función |
|---|---|
| `db` | PostgreSQL 17 con volumen persistente |
| `migrate` | Aplica migraciones y termina |
| `app` | API Fastify y SPA; volumen de evidencias |

Axia no incluye reverse proxy ni túnel. La base no se publica y `app` no abre puertos en el host:
queda solo en la red Docker `proxy` como `axia:3100`. Nginx Proxy Manager o Cloudflare Tunnel se
configuran fuera de este compose y se encargan de TLS. El compose fija `TRUST_PROXY=true` porque la
única vía de entrada es ese proxy.

## Puesta en marcha

```bash
cp .env.example .env
# Completar AXIA_IMAGE con la release elegida y ambos secretos; no usar valores de ejemplo.
chmod 600 .env
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy
docker compose up -d --wait
```

Compose descarga las imágenes de GHCR, arranca `db`, ejecuta `migrate` y arranca `app` cuando la
migración termina. No hay que construir imágenes en el servidor.

Comprobaciones:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1))"
```

La primera cuenta se crea desde `/login` a través del dominio ya publicado, o con `POST /api/setup`.
La contraseña debe tener al menos 12 caracteres.

## Nginx Proxy Manager

El operador crea la red externa `proxy` una sola vez con `docker network create proxy`. Conectar el
contenedor de NPM a esa red y crear un **Proxy Host**:

- Scheme: `http`.
- Forward Hostname: `axia`.
- Forward Port: `3100`.
- SSL: Let's Encrypt y **Force SSL**.

No hace falta configuración avanzada. NPM ya permite cuerpos de hasta 2000 MB, usa un timeout de
90 s y reenvía `X-Forwarded-For`/`X-Forwarded-Proto`. Axia envía `X-Accel-Buffering: no` para SSE.
Si el SSE se queda cargando, agregar `proxy_buffering off;` en Advanced. No se necesitan WebSockets.

Los detalles para conectar NPM a la red están en [`../../deploy/README.md`](../../deploy/README.md).

## Cloudflare Tunnel

Axia no incluye `cloudflared`. El túnel lo ejecuta quien despliega, conectado a la red `proxy`. En
Cloudflare, el **Service URL** debe ser `http://axia:3100`.

- No hace falta abrir puertos ni configurar un certificado de origen.
- Cloudflare termina TLS y reenvía `X-Forwarded-Proto` y `X-Forwarded-For`.
- El límite gratuito de subida es 100 MB; Axia usa 20 MiB por evidencia.
- SSE funciona sin configuración adicional.
- El `TUNNEL_TOKEN` pertenece a `cloudflared`, no al `.env` de Axia.

## Actualización

1. Revisar las notas de la release destino y reservar una ventana sin escritores ni tareas
   operativas concurrentes. Conservar el paquete, configuración y referencia de la release actual.
2. Ejecutar un conjunto de respaldo sobre la imagen instalada; no cambiar todavía `AXIA_IMAGE`.
3. Guardar el conjunto fuera del host y descargar el paquete de la release destino. Conservar los
   secretos y ajustes de la instancia; no reemplazar `.env` por una plantilla vacía.
4. Detener la app, seleccionar en `.env` el digest de la nueva release y actualizar los archivos
   operativos desde su paquete.
5. Descargar imágenes, aplicar migraciones explícitamente y arrancar solo si terminan bien.

```bash
./deploy/scripts/backup-all.sh
docker compose stop app
# Cambiar AXIA_IMAGE por el digest exacto de la release destino y actualizar archivos operativos.
docker compose pull
docker compose run --rm --no-deps migrate
docker compose up -d --wait app
docker compose logs migrate
```

El orden de arranque de Compose no detiene por sí mismo una app antigua que ya atiende peticiones.
Por eso la secuencia hace explícita la parada antes de migrar. Si la migración falla, mantener app
parada; conservar logs y recuperar el conjunto anterior en otro destino vacío si corresponde.
Si el arranque funciona, verificar salud, login y una evidencia antes de terminar el mantenimiento.

La CI verifica el commit, arranca el Compose real y solo entonces habilita publicar su imagen y
paquete. El smoke de esta consolidación comprueba también la actualización del historial anterior
a hashes; no simula cualquier salto arbitrario entre futuras versiones ni sustituye sus notas.

## Respaldos y recuperación

### Conjunto consistente

Configura una imagen de release fija en `AXIA_IMAGE` dentro del archivo de entorno de la instancia,
como exige la plantilla; app y migrador deben ejecutar esa misma imagen. Mantener la referencia
durante todo el respaldo. No hace falta exportarla al shell: los scripts consultan únicamente
la salida canónica de `docker compose config` con un filtro que extrae solo la imagen del servicio
exacto, sin leer el archivo directamente, guardar ni imprimir la configuración completa. Compose recibe sus variables como en el arranque habitual.

```bash
# AXIA_IMAGE en el archivo de entorno ya selecciona la release instalada.
BACKUP_DIR=/var/backups/axia ./deploy/scripts/backup-all.sh
```

`backup-all.sh` rechaza trabajos operativos one-off activos, detiene `app` y comprueba que terminó
con código cero. Si el apagado agotó su plazo o Docker tuvo que matarla, aborta sin respaldar.
Con la aplicación detenida, copia PostgreSQL con `pg_dump -Fc` y el volumen de evidencias. El
contenedor auxiliar usa el usuario de la imagen que posee las evidencias y transmite el tar por stdout; el shell del host
escribe archivos `0600`, dentro de un directorio `0700`, sin depender del UID de la imagen.

Cada conjunto contiene `database.dump`, `evidence.tgz` y `manifest`: formato, fecha UTC, referencia e
ID local inmutable de la imagen y SHA-256 de ambos archivos. El manifiesto permite detectar corrupción; no es una firma de autenticidad. Restaura solo conjuntos
generados por Axia y conservados bajo control del operador: los tar se extraen dentro del volumen con el usuario
de la aplicación y no deben sustituirse por archivos de terceros. El directorio temporal empieza por
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
# Configurar los secretos del destino y AXIA_IMAGE con la release exacta del manifiesto.
# Este ejemplo utiliza un archivo de entorno propio, sin leerlo desde el shell.
export COMPOSE_PROJECT_NAME=axia_recovery
export AXIA_ENV_FILE=/opt/axia-recovery/instance.env
./deploy/scripts/restore-all.sh /var/backups/axia/axia-<fecha>-<id>
docker compose --env-file "$AXIA_ENV_FILE" up -d app
```

La imagen local debe coincidir tanto en referencia como en ID con el manifiesto; descárgala antes
con Compose si hace falta. `restore-all.sh` valida los archivos y sus hashes antes de detener app.
Arranca y espera `db`, valida que ambos destinos estén vacíos y ejecuta el migrador de esa misma
release para preparar el rol interno, los esquemas y permisos en un host vacío. Después restaura la
base con `pg_restore --single-transaction --exit-on-error --clean --if-exists --no-owner`: un error
revierte toda la transacción de restauración. El esquema inicial del migrador puede permanecer,
pero no una carga parcial del dump.

Por último extrae las evidencias como el usuario de la imagen, con `--no-same-owner`: los archivos
quedan bajo el propietario efectivo de la aplicación sin requerir root ni capacidades adicionales. La base y los archivos no forman una
transacción distribuida: si falla cualquier paso, **app queda detenida**. No se debe publicar ese
destino. Conservar el conjunto y reintentar en un proyecto con volúmenes nuevos; el script no limpia
automáticamente un intento fallido. En éxito solo reinicia una app que estaba activa originalmente;
en un host vacío arrancarla explícitamente con el comando anterior.

Verificar salud, login, conteos de tiquets, eventos y evidencias, y abrir un archivo de evidencia antes
de cambiar el proxy al destino recuperado. Esta ruta también sirve para volver a una versión
anterior: restaurar su conjunto y su imagen en un proyecto nuevo, validar y después cambiar el
proxy. Cambiar únicamente el tag no revierte una migración.

El Compose de producción comparte por defecto la red/alias del proxy; al probar otra instancia en
el mismo host, usa una red y alias propios mediante un override para evitar colisiones. La prueba
de recuperación debe realizarse al instalar y después cada trimestre.

### Contrato para automatización y pruebas desechables

Todos los scripts de `deploy/scripts` aceptan `AXIA_ENV_FILE` (se entrega como `--env-file`) y
`AXIA_COMPOSE_FILE` (un archivo alternativo, mediante `-f`). Si no se define este último se respeta
`COMPOSE_FILE`, que permite varios archivos con el separador nativo de Compose. También se respeta
`COMPOSE_PROJECT_NAME`. Las rutas relativas de estas opciones se resuelven desde la raíz de Axia.
El proyecto determina los volúmenes; los coordinadores nunca suponen un nombre global de volumen.

Una prueba real debe usar un proyecto exclusivo, entorno ficticio temporal, red privada y volúmenes
nuevos; crear un registro testigo y una evidencia, tomar un conjunto, restaurarlo en un segundo
proyecto vacío y comprobar ambos datos. La prueba debe verificar además que repetir las migraciones
conserva el testigo. Las regresiones sin Docker se ejecutan así:

```bash
bash deploy/scripts/recovery.test.sh
```

### Scripts individuales

Se conservan `backup.sh`, `backup-evidence.sh`, `restore.sh` y `restore-evidence.sh` para operaciones
puntuales. Las copias individuales **no garantizan consistencia entre base y archivos**: usa el
coordinador para recuperación completa. Los backups individuales usan temporales privados y solo
aplican `RETENTION_DAYS` después de terminar correctamente.

`backup.sh` y `restore.sh` aceptan `DB_CONTAINER`, `PGUSER` y `PGDATABASE`, o `DATABASE_URL` para
herramientas PostgreSQL del host. `restore.sh` también es transaccional, pero no prepara roles ni
comprueba que el destino esté vacío: esa preparación y la parada de escritores corresponden al
operador. Los scripts individuales de evidencias usan el volumen del servicio `app`; para un
volumen explícito aceptan `EVIDENCE_VOLUME` junto con `AXIA_IMAGE` (`AXIA_APP_IMAGE` es compatible).
La restauración individual de evidencias exige un volumen vacío y app detenida.

## Limpieza y retención

Una subida que nunca termina deja un archivo parcial en el volumen. La cuota se comprueba al iniciar
la subida, y este trabajo elimina los archivos parciales de más de 24 horas y marca la fila como
`failed`; las filas de evidencia nunca se borran (RN-22).

La retención borra sesiones caducadas o revocadas, intentos de acceso y avisos ya leídos. Los avisos
sin leer y la bitácora de tiquets se conservan.

```bash
# Ambas tareas, con la pila levantada:
./deploy/scripts/cleanup.sh

# Por separado, en el contenedor:
docker compose run --rm app node dist/evidence/cleanup-cli.js
docker compose run --rm app node dist/maintenance/cleanup-cli.js

# En local:
pnpm db:cleanup-evidence
pnpm db:cleanup
```

Umbrales (días): `EVIDENCE_CLEANUP_HOURS` (24 horas), `RETENTION_SESSION_DAYS` (30),
`RETENTION_LOGIN_ATTEMPT_DAYS` (90) y `RETENTION_NOTIFICATION_DAYS` (90). Programar con cron junto
con los respaldos:

```cron
0 3 * * * cd /opt/axia && ./deploy/scripts/cleanup.sh >> /var/log/axia-cleanup.log 2>&1
```

## Operación y mantenimiento

- Revisar logs, espacio en disco y salud del contenedor.
- Programar los respaldos, la limpieza y la retención con cron o systemd.
- Mantener `.env` fuera del repositorio y con permisos `0600`.
- Rotar contraseñas de base y aplicación cuando corresponda; reiniciar `app` después.
- No añadir PgBouncer ni particiones sin medición previa. El pool de la aplicación está limitado a
  10 conexiones y `LISTEN/NOTIFY` usa una conexión dedicada.
- Revisar [`../reference/rendimiento-postgres.md`](../reference/rendimiento-postgres.md) antes de
  cambiar índices o parámetros.

## Secretos

| Variable | Rotación |
|---|---|
| `POSTGRES_OWNER_PASSWORD` | Cambiar el rol dueño y actualizar `.env` |
| `AXIA_APP_PASSWORD` | Cambiar el rol de aplicación, actualizar `.env` y reiniciar `app` |
| `AXIA_DEMO_PASSWORD` | Solo demo local; nunca en producción |

Nunca se versionan `.env`, dumps ni el volumen de evidencias.
