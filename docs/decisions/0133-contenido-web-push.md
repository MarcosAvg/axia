# 0133 — Contenido de los avisos Web Push

**Fecha:** 2026-11-25

**Estado:** aceptada

Cada notificación contiene el tipo de evento y el identificador del aviso. Fastify cifra esos
datos con las claves de la suscripción mediante RFC 8291. El service worker comparte con la
bandeja el catálogo de títulos y usa el identificador como etiqueta. Reenviar el mismo aviso
actualiza su entrada. Un aviso distinto conserva su propia entrada.

En la pantalla bloqueada se muestra el tipo de evento. Los nombres, folios y demás detalles
del tiquet se consultan en la bandeja autenticada. Si llega un mensaje vacío de una versión
anterior o un tipo desconocido, el service worker muestra un texto genérico.
