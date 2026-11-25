# 0132 — Entrega de avisos por Web Push

**Fecha:** 2026-11-24

**Estado:** aceptada. El formato y el agrupamiento del aviso cambiaron en
[0133](0133-contenido-web-push.md).

Cada aviso nuevo para una cuenta encola una entrega por suscripción en PostgreSQL en la misma
transacción. Se reutilizan las tablas `push_subscriptions` y `notification_deliveries`. El servidor
Fastify procesa las entregas pendientes, valida la cuenta, la sesión y el alcance del tiquet, y
reintenta los errores temporales durante un máximo de una hora. Un endpoint vencido se elimina.
El servidor descarta los envíos pendientes de sesiones cerradas o vencidas. Una entrega que
ya pasó la comprobación de sesión puede estar en tránsito. La entrega es de mejor esfuerzo y el navegador agrupa los avisos visibles
bajo una misma etiqueta. La bandeja conserva cada aviso y su lectura.

Se usa Web Push estándar con VAPID y mensajes sin cuerpo. El service worker muestra un texto
genérico y abre la bandeja. Esto evita enviar datos del tiquet al sistema operativo y permite
usar la criptografía de Node para firmar los mensajes. Los endpoints aceptados se limitan a
proveedores conocidos y el envío no sigue redirecciones. Se reutiliza el service worker de
Workbox y su política de actualización.

Axia inicia la solicitud de permiso al abrir con sesión iniciada. Si el navegador requiere
interacción, Axia muestra la opción en la pantalla actual. La suscripción se registra al
conceder el permiso. La clave VAPID es estable por instancia. La bandeja y SSE siguen
disponibles cuando la instancia funciona aislada o el navegador deniega el permiso.
