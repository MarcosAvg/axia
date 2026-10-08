# Ejemplos de reverse proxy (opcionales)

Axia **no impone** un reverse proxy. Estos archivos son puntos de partida para el **contrato de
despliegue** descrito en `../README.md`:

1. Servir `apps/web/dist` con *fallback* a `index.html`.
2. Hacer proxy a Kong (API de Supabase) **con WebSocket**.
3. `no-cache` para `sw.js`, `registerSW.js` y `manifest.webmanifest`.
4. Límite de subida para **evidencias**.
5. TLS.

- `nginx.conf`: dos *server blocks* (app y API). El más directo.
- `traefik-compose.yml`: Traefik + un nginx mínimo que sirve los estáticos.

Adáptalos a tu infraestructura; no se ejecutan desde el repositorio.
