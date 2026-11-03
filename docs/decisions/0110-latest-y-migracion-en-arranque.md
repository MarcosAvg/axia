# 0110 — Canal `latest` y migración en el arranque de la app

**Fecha:** 2026-11-03
**Estado:** aceptada

## Contexto

La instalación fijaba la imagen por digest y ejecutaba las migraciones en un servicio `migrate`
separado. Es una configuración reproducible, pero más ceremoniosa que la de los proyectos
selfhost de referencia: instalar y actualizar exige elegir un digest y coordinar dos contenedores.
La persona responsable pidió el modelo de Paperless/Vaultwarden: `latest` por defecto, una sola
aplicación que migra al arrancar y actualización con `docker compose pull` y
`docker compose up -d`.

## Decisión

1. **Canal por defecto `latest`.** `compose.yaml` usa
   `ghcr.io/marcosavg/axia/axia-app:latest` cuando `AXIA_IMAGE` no está definido. Cada release
   publica `latest`, `vX.Y.Z` y el SHA del commit. Un operador puede fijar `AXIA_IMAGE` a una
   etiqueta o a un digest para producción reproducible.
2. **Una sola imagen y un solo servicio de aplicación.** Se retira `migrate`. El comando de
   `app` ejecuta `dist/db/migrate.js` y, solo si termina bien, `exec node dist/server.js`.
3. **Credenciales de migración durante el arranque.** `app` recibe `MIGRATION_DATABASE_URL` y
   `AXIA_APP_PASSWORD` para aplicar migraciones y crear el rol `axia_app` si falta. Antes de
   arrancar el servidor, el proceso elimina esas variables de su entorno. El runtime sigue usando
   `axia_app`, con permisos limitados.
4. **Actualización simple y recuperable.** `docker compose pull && docker compose up -d --wait`
   detiene y recrea `app`; el contenedor nuevo migra antes de escuchar. El respaldo previo sigue
   siendo obligatorio para actualizaciones con datos reales. Las migraciones no se revierten
   cambiando de etiqueta: se restaura el conjunto y su imagen en un destino vacío.
5. **Identidad de release.** `release.json` y el manifiesto de respaldo conservan el digest o el ID
   local de la imagen. El paquete deja `AXIA_IMAGE` comentado y usa `latest` por defecto.

## Consecuencias

- Instalar y actualizar se acerca a la experiencia de Paperless/Vaultwarden: dos servicios y un
  comando de actualización.
- El contenedor de `app` conoce la credencial de dueño durante el arranque. Es el costo de no
  tener un contenedor de migración separado; el proceso servidor la elimina antes de atender.
- El healthcheck necesita un `start_period` amplio para cubrir migraciones lentas.
- Los scripts de respaldo, restauración y smoke usan `compose run app node dist/db/migrate.js` en
  lugar del servicio retirado.
- La separación de roles se conserva: la app sigue consultando como `axia_app`; solo la migración
  usa el rol dueño.

## Alternativas descartadas

- Mantener el digest como única opción: reproducible, pero innecesariamente hostil para una
  instalación selfhost pequeña.
- Ejecutar migraciones con `axia_app`: exigiría dar DDL al rol de runtime y ampliar su privilegio.
- Usar un único rol para runtime y migración: elimina la separación que protege la bitácora y el
  resto del esquema.
- Conservar `migrate` y añadir un `update.sh`: mantiene la seguridad, pero no elimina el segundo
  contenedor ni se parece al modelo solicitado.

## Referencias

Sustituye parcialmente la decisión de imagen exacta y servicio migrador de
[0099](0099-consolidacion-self-hosted.md), y la de actualización explícita de
[operación](../guides/operacion.md).
