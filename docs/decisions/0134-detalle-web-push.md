# 0134 — Detalle de los avisos Web Push

**Fecha:** 2026-11-25

**Estado:** aceptada. Sustituye el contenido descrito en
[0133](0133-contenido-web-push.md).

El mensaje push sigue llevando solo el identificador y el tipo del aviso: los datos del tiquet no
se transmiten al proveedor push. Al recibirlo, el service worker consulta
`GET /api/notifications/:id` con la cookie de la sesión del dispositivo y compone título y cuerpo
con el mismo formateador de la bandeja. La notificación del sistema muestra así el folio, el actor,
el motivo y el detalle del aviso, y la bandeja sigue siendo la fuente autorizada.

Si la consulta falla (sin sesión, sin red o aviso ya no accesible), se muestra el tipo de evento y,
si tampoco se conoce, un texto genérico. La PWA compila el service worker con `injectManifest` para
reutilizar el formateador; la actualización sigue bajo confirmación.

Consecuencia: el detalle del tiquet aparece en la pantalla bloqueada del dispositivo, aunque no se
transmite por el proveedor push. Para revertir, basta volver a un push con solo el tipo y un worker
que no consulte la API.
