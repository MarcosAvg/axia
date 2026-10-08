# Axia — Notificaciones: correo, push y escalamiento

Este documento describe cómo **activar** los envíos reales. La base de datos ya existe
(`notifications`, `notification_rules`, `escalation_rules`, `push_subscriptions`); lo que falta es el
**proceso de envío** y las claves. Nada de esto es requisito del núcleo.

## 1. Correo (Supabase Auth y avisos)

Supabase envía los correos de Auth (invitaciones, recuperación) usando su **SMTP**. Configúralo en el
`.env` del compose autoalojado (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_ADMIN_EMAIL`), y `SITE_URL`/`API_EXTERNAL_URL` con tus dominios. Ver `deploy/supabase/README.md`.

## 2. Push en el navegador (Web Push)

Piezas:

1. **Claves VAPID** (una vez): generar con `npx web-push generate-vapid-keys`. Guarda la **pública**
   como `VITE_VAPID_PUBLIC_KEY` (build del frontend) y la **privada** como secreto del servidor
   (Edge Function). Nunca en el repositorio.
2. **Suscripción del navegador**: pides permiso con `Notification.requestPermission()`, te suscribes
   con `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` y guardas
   el objeto (endpoint + `p256dh` + `auth`) en `push_subscriptions` (una fila por endpoint; hay RLS
   para que cada usuario administre las suyas).
3. **Service worker con `push`**: hoy el build usa la estrategia `generateSW`. Para escuchar el evento
   `push` hay que pasar a `injectManifest` y añadir un `src/sw.ts` con:
   ```ts
   self.addEventListener('push', (event) => {
     const data = event.data?.json() ?? {}
     event.waitUntil(self.registration.showNotification(data.title ?? 'Axia', {
       body: data.body ?? '', data: data.url ? { url: data.url } : undefined,
     }))
   })
   self.addEventListener('notificationclick', (event) => {
     event.notification.close()
     const url = event.notification.data?.url ?? '/'
     event.waitUntil(clients.openWindow(url))
   })
   ```
   Mantén el `registerType: 'prompt'` para no interrumpir un trabajo en curso.
4. **Envío** (Edge Function): una función (p. ej. `supabase/functions/notify-push`) que, ante una fila
   nueva de `notifications` con `channel = 'push'`, lea las suscripciones del destinatario y envíe con
   `web-push` (Deno: `npm:web-push`) usando VAPID. Se despliega con
   `supabase functions deploy notify-push --project-ref <ref>` (fuera del repositorio; requiere
   claves). Los **secretos** de la función se configuran con `supabase secrets set`.

> La tabla `push_subscriptions` ya está creada por si quieres activar esto; el envío queda como
> trabajo opcional porque necesita claves y despliegue.

## 3. Escalamiento

`escalation_rules` define condiciones (`untaken`, `unassigned`, `no_candidate`, `target_near`,
`target_overdue`) con umbral y destinatario. Falta un **job** (cron de Supabase o una Edge Function
programada) que evalúe las reglas y cree filas en `notifications`; a partir de ahí, el envío es el
mismo de las secciones 1 y 2.

## 4. En la app

Las notificaciones in-app ya se guardan en `notifications`; falta la **bandeja de notificaciones** y
el botón para **activar push** (queda como trabajo de interfaz). Hoy `/inbox` es la bandeja de
trabajo del supervisor, no la de avisos.
