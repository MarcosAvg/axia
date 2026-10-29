# 0075 — Instalación, secretos, respaldos y CI del stack propio

**Estado:** aceptada
**Fecha:** 2026-10-21

## Contexto

El stack nuevo (`PostgreSQL 17` + `migrate` + `app`) necesita una instalación reproducible sin
secretos fijos ni pasos manuales frágiles. La web todavía no se publica desde este stack; el corte
final del SPA será posterior.

## Decisión

1. **Instalación local guiada.** `scripts/install.sh` valida Docker/Compose/openssl, genera
   `POSTGRES_OWNER_PASSWORD` y `AXIA_APP_PASSWORD` con 32 bytes aleatorios, escribe `.env` con
   permisos `0600` y no imprime los secretos. Se niega a sobrescribir un `.env` existente.
2. **Compose por capas.** `compose.yaml` define `db`, `migrate` y `app`; `compose.dev.yaml` publica
   la base y la API solo en `127.0.0.1`. Producción no usa el overlay de desarrollo y deja la API
   detrás del reverse proxy.
3. **Primer administrador explícito.** La instalación no inventa credenciales de administrador. Se
   usa `POST /api/setup` una sola vez, con la política de contraseña del servidor.
4. **Respaldos separados.** `pg_dump -Fc` para la base y un archivo `tar.gz` para el volumen de
   evidencias. Restaurar solo uno de los dos deja el sistema inconsistente. Se documenta una prueba
   de restauración periódica.
5. **CI del stack nuevo.** El flujo añade `check-next` con PostgreSQL 17 como servicio real:
   migraciones, pruebas unitarias/HTTP, integración, `drizzle-kit check` y build. La compuerta
   existente con el stack anterior se mantiene hasta el corte final.
6. **Sin secretos en CI.** Los valores de CI son de prueba y no se reutilizan en producción.

## Consecuencias

- Una persona puede instalar el stack con un comando y sin copiar contraseñas de ejemplo.
- Los respaldos de base y evidencias se hacen y se prueban por separado.
- La rotación de contraseñas requiere actualizar `.env`, el rol correspondiente y reiniciar el
  servicio afectado.
- `install.sh` es solo para entornos locales o de prueba; producción requiere revisar el `.env` y
  conectar Nginx Proxy Manager o Cloudflare Tunnel a la red `proxy`.

## Alternativas descartadas

- **Contraseñas de ejemplo o `CHANGE_ME` en ejecución:** dejan instalaciones inseguras.
- **Un único backup lógico de todo:** PostgreSQL y el volumen de evidencias tienen ciclos y
  herramientas distintos.
- **Publicar `app` directamente en producción:** impide terminar TLS y validar el origen en un
  proxy de confianza.
- **Sustituir ya la compuerta con el stack anterior:** rompería la web actual antes del corte final.
