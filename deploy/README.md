# Instalar Axia

Este procedimiento prepara una instancia nueva con datos persistentes. Para actualizar una
instancia existente, conservar su configuración y sus volúmenes y seguir la
[guía de operación](../docs/guides/operacion.md).

## Requisitos

- Linux, Docker Engine y el plugin de Docker Compose v2 o posterior.
- Un proxy inverso o túnel para publicar HTTPS. Tener a mano el dominio y la red Docker del proxy.
- Bash y herramientas del host como `tar`, `sha256sum` y `openssl`.

Las notas de release indican la arquitectura y la ruta de actualización verificadas.
Para trabajar con el código fuente, consultar [desarrollo](../docs/start/desarrollo.md).

## 1. Descargar y verificar

Descargar `axia-self-hosted.tar.gz` y `axia-self-hosted.tar.gz.sha256` de la
[versión estable](https://github.com/MarcosAvg/axia/releases/latest). Desde el directorio de
descarga, verificar el archivo comprimido con su checksum y extraerlo en un directorio nuevo.

```bash
sha256sum -c axia-self-hosted.tar.gz.sha256 &&
  mkdir axia &&
  tar -xzf axia-self-hosted.tar.gz -C axia
```

El paquete contiene `compose.yaml`, `.env.example`, los scripts operativos, la licencia,
el manual `OPERATIONS.md` y la identidad de la release en `release.json`.

## 2. Guardar la configuración

Desde el directorio nuevo de Axia, crear el archivo de entorno con permisos privados.

```bash
cd axia
(umask 077 && cp .env.example .env)
```

Generar dos valores distintos con `openssl rand -hex 32` y guardarlos en
`POSTGRES_OWNER_PASSWORD` y `AXIA_APP_PASSWORD`. Usar valores hexadecimales para que puedan
insertarse en las URLs de PostgreSQL. Para una instancia con datos reales, fijar `AXIA_IMAGE`
al valor de `image` de `release.json`. Si se omite, Compose usa el canal estable `latest`.
Consultar las opciones en [configuración](../docs/reference/configuracion.md).

## 3. Preparar el proxy y arrancar

Crear la red externa predeterminada si aún no existe.

```bash
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy
```

Si el proxy ya usa otra red, definir `AXIA_PROXY_NETWORK` con su nombre. Conectar el proxy a esa
red y configurar el destino HTTP `axia:3100`. Para alojar varias instancias, usar un proyecto
Compose y un `AXIA_PROXY_ALIAS` distintos por instancia. Usar el alias correspondiente como
destino del proxy.

| Ajuste del proxy | Requisito |
|---|---|
| Acceso inicial | Restringir el dominio al operador antes de arrancar Axia |
| TLS | Publicar HTTPS y redirigir HTTP a HTTPS |
| Encabezados | Conservar `Host` y reenviar `X-Forwarded-For` y `X-Forwarded-Proto` |
| Cargas | Permitir hasta 20 MiB por evidencia y 25 MiB por adjunto con los límites predeterminados |
| Eventos en vivo | Mantener la conexión SSE abierta más allá del heartbeat y desactivar el buffering de ese flujo |

Axia confía en los encabezados del proxy. Conectar a esa red solo servicios de confianza y guardar
los tokens del proxy en la configuración del propio proxy.

```bash
docker compose up -d --wait
docker compose ps
```

Compose inicia PostgreSQL (`db`) y la aplicación (`app`) sin publicar puertos del host.
La app aplica las migraciones antes de escuchar en el puerto `3100`. PostgreSQL y los archivos
persisten en volúmenes separados.

## 4. Crear el administrador y validar

1. Abrir `/login` desde el dominio HTTPS restringido y crear el primer administrador.
2. Configurar los [catálogos mínimos](../docs/guides/administracion.md#catálogos). Para la prueba
   de archivos, habilitar un tipo de adjunto obligatorio en el problema de prueba.
3. Iniciar sesión y comprobar un tiquet de prueba con una evidencia y un adjunto. Subir y abrir
   ambos archivos a través de HTTPS y verificar que los avisos en vivo llegan por SSE.
4. Preparar un respaldo coordinado y ensayar su restauración antes de usar datos reales.
5. Habilitar el acceso a usuarios una vez completada la validación.

Si falla el arranque, revisar `docker compose ps` y `docker compose logs --tail=100 app`.
La [guía de operación](../docs/guides/operacion.md) cubre el diagnóstico, los respaldos, las
actualizaciones y la recuperación después de una migración fallida.
