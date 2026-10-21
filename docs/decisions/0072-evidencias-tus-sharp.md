# 0072 — Evidencias en volumen local, TUS y Sharp

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

Las evidencias dejan de vivir en un servicio de objetos externo. El servidor es el único cliente de
PostgreSQL y también debe custodiar los archivos, procesarlos y servirlos solo a quien puede ver el
tiquet.

## Decisión

1. **Volumen local** `axia_evidence` montado en `/data/evidence`; `STORAGE_DIR` configurable. El
   despliegue puede montar un volumen del host o un almacenamiento de red.
2. **TUS propio** con `@tus/server` y `@tus/file-store` en `/api/uploads`. La fila `evidence` se crea
   antes de la subida en estado `pending`; el identificador TUS es el UUID de la evidencia.
3. **Autenticación TUS** por la cookie de sesión. Cada petición comprueba que la evidencia pertenece
   al actor. Las evidencias no se eliminan por TUS.
4. **Sharp** valida JPEG/PNG/WebP, corrige la orientación EXIF, limita el lado mayor a 4096 px,
   normaliza a WebP y genera una miniatura de 320 px. El EXIF se descarta en la salida.
5. **Límites** por archivo 20 MiB y cuota 500 MiB por usuario, configurables por entorno. La cuota se
   comprueba al crear la evidencia y al terminar el procesamiento.
6. **Entrega autenticada** con `GET /api/evidence/:id/file` y `/thumbnail`; se resuelve el tiquet y
   se aplica el mismo alcance que en la API de lectura. Un archivo fuera de alcance responde 404.
7. **Metadatos en PostgreSQL**: ruta relativa, MIME, tamaño, dimensiones, SHA-256 y estado de
   procesamiento. Los archivos no se eliminan; la limpieza de `pending` huérfanos queda para la
   operación programada.

## Consecuencias

- No se necesita un contenedor de almacenamiento ni credenciales de un proveedor externo.
- El servidor debe tener espacio suficiente y respaldo del volumen.
- La entrega pasa por el servidor, lo que simplifica permisos y auditoría, con el coste de ancho de
  banda del proceso Node.
- La cuota se mide con un índice parcial por `uploaded_by` y `processing_state = 'ready'`.

## Alternativas descartadas

- **Servicio de objetos externo:** introduce dependencia y credenciales; no es necesario para el
  núcleo.
- **Guardar el archivo en PostgreSQL:** complica backups y memoria; el volumen es más simple.
- **Servir rutas firmadas sin comprobar el tiquet:** filtraría evidencias fuera del alcance.
