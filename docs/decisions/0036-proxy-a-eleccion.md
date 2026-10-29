# 0036 — El reverse proxy es elección de quien despliega

- Fecha: 2026-10-08
- Actualizado: 2026-10-29
- Estado: aceptada (ajusta la 0032; convive con 0075)

## Contexto

En una fase anterior se incluyó un `deploy/Caddyfile` como proxy por defecto. Axia es un único
servidor Fastify que sirve la API y el SPA compilado; el TLS y el enrutamiento de borde son
infraestructura del despliegue, no del producto. Imponer Caddy es una opinión y puede ser redundante
con el proxy que la institución ya tenga (Traefik, nginx, Apache, un balanceador de nube…).

## Decisión

- **No** se incluye ningún reverse proxy y no se versionan configuraciones de proxy.
- `compose.yaml` es el compose de producción: usa las imágenes de GHCR, conecta `app` a la red
  `${PROXY_NETWORK:-proxy}` y publica `127.0.0.1:${APP_PORT:-3100}` para un proxy del host. No añade
  servicios ni TLS.
- `compose.dev.yaml` construye las imágenes localmente para desarrollo.
- Si el proxy es otro contenedor, se conecta a la red `proxy` y usa `app:3100`.
- El **contrato de despliegue** (cabeceras, `TRUST_PROXY`, TUS, SSE, caché y TLS) vive en
  `deploy/README.md` y `docs/guides/operacion.md`.
- El stack se levanta con `docker compose up -d` o `deploy/scripts/up.sh`; no hay overlay de
  publicación.

## Alternativas consideradas

- **Dejar Caddy por defecto**: cómodo en un VPS “pelado”, pero impone una herramienta y choca con
  quien ya tiene proxy.
- **Vendorear un compose con Caddy dentro**: además de lo anterior, obliga a mantener una pila de
  terceros en el repositorio.
- **Publicar `app` en todas las interfaces**: expone la API sin TLS ni control de borde.

## Consecuencias

- El despliegue se adapta a la infraestructura existente; Axia no opina sobre el proxy.
- Quien despliega configura TLS, cabeceras y límites según su host.
- Revisión de la 0032: su mención a Caddy queda superada por esta decisión.
- Revisión de la 0075: el stack actual sirve el SPA desde `app` y publica imágenes en GHCR para
  desplegar sin construir en el servidor.
