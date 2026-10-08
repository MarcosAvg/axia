# 0036 — El reverse proxy es elección de quien despliega

- Fecha: 2026-10-08
- Estado: aceptada (ajusta la 0032)

## Contexto

En la Fase 7A/7B se incluyó un `deploy/Caddyfile` como proxy por defecto (TLS automático,
frontend estático y proxy de la API). Al revisarlo: Axia es una **SPA estática** más un endpoint de
Supabase (Kong, que ya es un proxy), así que el proxy de borde es **infraestructura del despliegue**,
no del producto. Imponer Caddy es una opinión y puede ser redundante con el proxy que la institución
ya tenga (Traefik, nginx, Apache, un balanceador de nube…).

## Decisión

- **No** se incluye ningún reverse proxy. Se elimina `deploy/Caddyfile`.
- Se documenta un **contrato de despliegue** (`deploy/README.md`): qué debe cumplir cualquier proxy
  (estáticos con *fallback* SPA, proxy a Kong con WebSocket, límite de subida, `no-cache` del
  service worker y TLS).
- Se ofrecen **ejemplos opcionales** en `deploy/examples/` (nginx y Traefik) como referencia, no como
  requisito.
- El **stack** se levanta con un comando (`deploy/scripts/up.sh`) que trae el compose oficial de
  Supabase (que **sigue sin versionarse**) y aplica migraciones; no incluye servidor web.

## Alternativas consideradas

- **Dejar Caddy por defecto**: cómodo en un VPS “pelado”, pero impone una herramienta y choca con
  quien ya tiene proxy.
- **Vendorear un compose con Caddy dentro**: además de lo anterior, obliga a mantener una pila de
  terceros en el repositorio.

## Consecuencias

- El despliegue se adapta a la infraestructura existente; Axia no opina sobre el proxy.
- El repositorio gana un **contrato** y **ejemplos**, en lugar de una configuración obligatoria.
- Revisión de la 0032: su mención a Caddy queda superada por esta decisión.
- El envoltorio `up.sh` es un guion, no una capa nueva: el stack sigue siendo el compose oficial.
