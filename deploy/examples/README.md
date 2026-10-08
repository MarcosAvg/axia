# Ejemplos de reverse proxy

Axia no impone un reverse proxy. Estos archivos son puntos de partida para el **contrato de
despliegue** descrito en `../README.md`:

1. Servir el frontend con *fallback* a `index.html`.
2. Enrutar hacia Kong (API de Supabase) permitiendo **WebSocket**.
3. Aplicar `no-cache` a `config.js`, `sw.js`, `registerSW.js` y `manifest.webmanifest`.
4. Permitir el tamaño de subida de las **evidencias**.
5. Terminar TLS.

- `nginx.conf`: dos *server blocks* (web y API).
- `traefik-compose.yml`: Traefik y un nginx que sirve los archivos estáticos.

Son ejemplos y deben adaptarse a cada infraestructura; no se ejecutan desde el repositorio.
