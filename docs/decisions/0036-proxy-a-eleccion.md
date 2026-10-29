# 0036 — El reverse proxy es elección de quien despliega

- Fecha: 2026-10-08
- Actualizado: 2026-10-29
- Estado: aceptada (ajusta la 0032; convive con 0075)

## Contexto

En una fase anterior se incluyó un `deploy/Caddyfile` como proxy por defecto. Axia es un único
servidor Fastify que sirve la API y el SPA compilado; el TLS y el enrutamiento de borde son
infraestructura del despliegue, no del producto. Los despliegues previstos son Nginx Proxy Manager y
Cloudflare Tunnel, y en ambos el proxy o túnel lo configura quien despliega.

## Decisión

- **No** se incluye ningún reverse proxy ni túnel, y no se versionan sus configuraciones.
- `compose.yaml` es el compose de producción: usa las imágenes `:latest` de GHCR y deja `app` solo
  en la red `proxy`, con el alias `axia:3100`. No publica puertos ni añade TLS.
- `app` fija `TRUST_PROXY=true` porque la única entrada es el proxy.
- `compose.dev.yaml` construye las imágenes localmente y publica la app en loopback para desarrollo.
- NPM o `cloudflared` se conectan a la red `proxy` y usan `axia:3100`.
- La guía concreta vive en `deploy/README.md` y `docs/guides/operacion.md`.
- El stack se levanta con `docker compose up -d`; no hay scripts envoltorio ni overlay de
  publicación.

## Alternativas consideradas

- **Dejar Caddy por defecto**: cómodo en un VPS “pelado”, pero impone una herramienta y choca con
  quien ya tiene proxy.
- **Incluir NPM o `cloudflared` en el compose**: mezcla el producto con infraestructura que cada
  instalación configura distinto.
- **Publicar `app` en todas las interfaces**: expone la API sin TLS ni control de borde.

## Consecuencias

- El despliegue se adapta a NPM o Cloudflare Tunnel; Axia no opina sobre el proxy.
- Quien despliega configura TLS, cabeceras y límites en su proxy.
- `latest` simplifica el despliegue; para fijar una versión se edita `compose.yaml`.
- Revisión de la 0032: su mención a Caddy queda superada por esta decisión.
- Revisión de la 0075: el stack actual sirve el SPA desde `app` y publica imágenes en GHCR para
  desplegar sin construir en el servidor.
