# Despliegue

Axia se levanta con `compose.yaml`: PostgreSQL, el servicio `migrate` y el servidor `app`. La app no
publica puertos en el host; solo queda disponible en la red Docker `proxy` con el alias `axia:3100`.
El reverse proxy o el túnel los configura quien despliega.

## Puesta en marcha

```bash
cp .env.example .env
# Completar POSTGRES_OWNER_PASSWORD y AXIA_APP_PASSWORD.
# Generar cada uno con: openssl rand -hex 32
chmod 600 .env
docker compose up -d
```

`docker compose up -d` descarga las imágenes de GHCR, arranca `db`, ejecuta `migrate` y arranca `app`
cuando la migración termina. No hay que construir imágenes en el servidor.

Comprobaciones:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose exec app node -e "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1))"
```

La primera cuenta se crea desde `/login` a través del dominio ya publicado, o con `POST /api/setup`.

## Nginx Proxy Manager

Axia crea la red `proxy`. Conecta el contenedor de NPM a esa red:

```yaml
services:
  npm:
    networks:
      - proxy

networks:
  proxy:
    external: true
```

Si NPM ya está corriendo, también puedes hacerlo sin recrearlo:

```bash
docker network connect proxy <contenedor-npm>
```

En NPM crea un **Proxy Host**:

- Domain: tu dominio.
- Scheme: `http`.
- Forward Hostname: `axia`.
- Forward Port: `3100`.
- SSL: Let's Encrypt y **Force SSL**.

No hace falta configuración avanzada. Los valores por defecto de NPM ya cubren este despliegue:

- `client_max_body_size 2000m`, muy por encima de los 20 MiB por evidencia.
- `proxy_read_timeout 90s`, mayor que el heartbeat SSE de 15 s.
- Reenvía `X-Forwarded-For` y `X-Forwarded-Proto`, y conserva `Host`.
- Axia envía `X-Accel-Buffering: no` para SSE.

Si el SSE se queda cargando, agrega `proxy_buffering off;` en la pestaña Advanced del Proxy Host.
No necesitas activar WebSockets: Axia usa SSE.

## Cloudflare Tunnel

Axia no incluye `cloudflared`. El túnel lo ejecuta quien despliega, en la misma red `proxy`:

- En Cloudflare, el **Service URL** debe ser `http://axia:3100`.
- El contenedor de `cloudflared` debe estar conectado a la red `proxy`.
- No hace falta abrir puertos ni configurar un certificado de origen.
- Cloudflare termina TLS y reenvía `X-Forwarded-Proto` y `X-Forwarded-For`.
- El límite gratuito de subida de Cloudflare es 100 MB; Axia usa 20 MiB por evidencia.
- SSE funciona sin configuración adicional.

El `TUNNEL_TOKEN` pertenece a la configuración de `cloudflared`, no al `.env` de Axia.

## Actualización

```bash
docker compose pull
docker compose up -d
```

Compose recrea `migrate` si cambió la imagen y aplica las migraciones antes de arrancar `app`. Para
ver el resultado:

```bash
docker compose logs migrate
```

## Respaldos y limpieza

```bash
BACKUP_DIR=/var/backups/axia RETENTION_DAYS=14 ./deploy/scripts/backup.sh
BACKUP_DIR=/var/backups/axia ./deploy/scripts/backup-evidence.sh
./deploy/scripts/cleanup.sh
```

Hay que respaldar base y evidencias juntas. La restauración y el detalle de retención están en
[`../docs/guides/operacion.md`](../docs/guides/operacion.md).

La ejecución real en un servidor la hace la persona; el agente no toca producción ni la nube.
