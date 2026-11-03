# Instalar Axia

Axia se instala desde el paquete `axia-self-hosted.tar.gz` de una release verificada. El host solo
necesita Docker Engine y Compose v2, además de un proxy o túnel que publique HTTPS.
Los scripts operativos requieren Bash y herramientas del host como `sha256sum`, `tar` y `awk`.
No se requiere Node.js, pnpm, Git ni compilar código. El paquete incluye `compose.yaml`, `.env.example`, scripts de operación,
licencia, manual de operación (`OPERATIONS.md`) e identidad de la release en `release.json`.
Esta guía instala una instancia con datos persistentes. Para trabajar en el código, consultar
[Desarrollo](../docs/start/desarrollo.md).

## Instalar

Estos pasos son para una instancia nueva. Si ya existen configuración o volúmenes de Axia,
conservarlos y seguir [Operación](../docs/guides/operacion.md); no sobrescribir el archivo de
entorno ni generar secretos nuevos sobre una base existente.

1. Descargar y extraer el paquete de una release concreta en un directorio nuevo y vacío de la instancia.
2. Crear el archivo de entorno y completar los dos secretos con valores aleatorios. La plantilla
   del paquete ya fija `AXIA_IMAGE` por digest; conservar esa referencia. Las demás opciones están
   en [Configuración](../docs/reference/configuracion.md).
3. Preparar la red del proxy y arrancar los servicios.

```bash
cp .env.example .env
# Generar cada secreto con openssl rand -hex 32 (solo hexadecimal).
# No usar caracteres como /, #, ? o %: rompen las URLs de conexión.
# Completar POSTGRES_OWNER_PASSWORD y AXIA_APP_PASSWORD sin cambiar AXIA_IMAGE.
chmod 600 .env
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy
docker compose up -d --wait
```

Se arrancan tres servicios: PostgreSQL (`db`), un trabajo de migraciones que termina (`migrate`) y
el servidor (`app`). App y migrador usan exactamente la misma imagen, con comandos y credenciales
diferentes. Los datos y evidencias viven en volúmenes separados. El rol de la app es `axia_app` fijo.

No ejecutar `scripts/install.sh`: prepara desarrollo, no una instancia de producción.

## Conectar el proxy

La app no publica puertos del host; solo se alcanza en la red Docker externa `proxy`, mediante
`axia:3100`. Conectar a esa red el proxy o túnel del operador. Si ya tiene otra red, definir
`AXIA_PROXY_NETWORK` en `.env`. Para varias instancias en una red, elegir distintos proyectos
Compose y `AXIA_PROXY_ALIAS` para evitar colisiones.

Configurar el proxy elegido con destino HTTP `axia:3100` (o el alias configurado), dominio público
y TLS con redirección HTTPS. Debe conservar `Host`, reenviar `X-Forwarded-For` y
`X-Forwarded-Proto`, admitir evidencias de 20 MiB con la configuración predeterminada de Axia y
mantener conexiones SSE abiertas más allá de su heartbeat. Desactivar buffering para SSE si el
proxy lo aplica. No se necesitan WebSockets. Comprobar estos requisitos en la configuración del
proxy; sus límites y valores predeterminados dependen de la herramienta elegida.

Los tokens de un proxy o túnel pertenecen a su configuración y no al archivo de entorno de Axia.

El contenedor confía en el proxy de esta red. No conectar contenedores ajenos o no confiables.

## Crear el primer administrador y comprobar

```bash
docker compose ps
docker compose logs --tail=100 migrate
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

Abrir `/login` desde el dominio HTTPS: si la instancia está vacía, permite crear el primer
administrador. Después, comprobar login y un tiquet con evidencia. Producción no carga demo.
La política de contraseña se consulta en [Configuración](../docs/reference/configuracion.md).
El migrador terminado con código cero es normal y no requiere reiniciarse continuamente.

## Actualizar y recuperar

La [guía de operación](../docs/guides/operacion.md) contiene la secuencia de actualización,
respaldos, recuperación, retención y diagnóstico. Preparar y probar un respaldo antes de utilizar
la instancia con datos reales. Cambiar a una imagen anterior no revierte migraciones: se recupera
su conjunto de respaldo y su imagen en un destino vacío.
