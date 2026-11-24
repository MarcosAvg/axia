/* global self */
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Axia', {
      body: 'Tienes una nueva notificación en Axia.',
      icon: '/pwa-192.png',
      tag: 'axia-avisos',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clients) => {
        const inbox = clients.find(
          (client) => new URL(client.url).pathname === '/avisos',
        )
        return inbox ? inbox.focus() : self.clients.openWindow('/avisos')
      }),
  )
})
