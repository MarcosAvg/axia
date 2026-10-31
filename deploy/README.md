# Despliegue

Axia se instala desde el paquete `axia-self-hosted.tar.gz` de una release verificada. El host solo
necesita Docker Engine y Compose v2, además del proxy TLS elegido. No se requiere Node.js, pnpm,
Git ni compilar código. El paquete incluye `compose.yaml`, `.env.example`, scripts de operación,
licencia y la identidad de la release en `release.json`.

## Instalar

1. Descargar y extraer el paquete de una release concreta en un directorio de la instancia.
2. Crear el archivo de entorno y completar los dos secretos con valores aleatorios. La plantilla
   del paquete ya fija `AXIA_IMAGE` por digest; en un checkout del repositorio se debe completar.
3. Preparar la red del proxy y arrancar los servicios.

```bash
cp .env.example .env
# Generar cada secreto con openssl rand -hex 32 o un generador de contraseñas.
# Completar POSTGRES_OWNER_PASSWORD y AXIA_APP_PASSWORD sin cambiar AXIA_IMAGE.
chmod 600 .env
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy
docker compose up -d --wait
```

Se arrancan tres servicios: PostgreSQL (`db`), un trabajo de migraciones que termina (`migrate`) y
el servidor (`app`). App y migrador usan exactamente la misma imagen, con comandos y credenciales
diferentes. Los datos y evidencias viven en volúmenes separados. El rol de la app es `axia_app` fijo.

La primera cuenta se crea en `/login` cuando la instancia está vacía. Producción no carga demo.

## Conectar el proxy

La app no publica puertos del host; solo se alcanza en la red Docker externa `proxy`, mediante
`axia:3100`. Conectar a esa red el proxy o túnel del operador. Si ya tiene otra red, definir
`AXIA_PROXY_NETWORK` en `.env`. Para varias instancias en una red, elegir distintos proyectos
Compose y `AXIA_PROXY_ALIAS` para evitar colisiones.

Para Nginx Proxy Manager, usar Scheme `http`, Forward Hostname `axia`, Forward Port `3100` y TLS
con redirección HTTPS. El proxy debe conservar Host, reenviar `X-Forwarded-For`/`X-Forwarded-Proto`,
admitir evidencias de 20 MiB y dejar conexiones SSE abiertas por más de 15 segundos. Si hay buffering
SSE, desactivarlo. No se necesitan WebSockets.

Para un túnel, conectar su contenedor a la misma red y seleccionar `http://axia:3100` como destino.
Los tokens del proxy/túnel pertenecen a su configuración y no al archivo de entorno de Axia.

El contenedor confía en el proxy de esta red. No conectar contenedores ajenos o no confiables.

## Comprobar

```bash
docker compose ps
docker compose logs --tail=100 migrate
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1))"
```

Comprobar además creación del primer administrador, login y un tiquet con evidencia. El migrador
terminado con código cero es normal y no requiere reiniciarse continuamente.

## Actualizar y recuperar

Antes de cambiar imagen, ejecutar `./deploy/scripts/backup-all.sh` sobre la versión instalada.
Guardar el conjunto y su imagen fuera del host. Descargar el paquete de la nueva release, revisar
sus notas y conservar la configuración y scripts previos. Con la app detenida, cambiar a la imagen
exacta seleccionada, migrar y volver a arrancar. No actualizar automáticamente mediante `latest`.

La secuencia completa, programación de copias, permisos y recuperación en un destino vacío se
encuentran en la [guía de operación](../docs/guides/operacion.md). Cambiar a un tag anterior no
revierte migraciones: para recuperar se utilizan la imagen y el conjunto de respaldo anteriores.
