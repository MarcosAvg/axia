/* global self */
self.addEventListener('message', (event) => {
  if (event.data === 'AXIA_PUSH_READY') event.ports[0]?.postMessage(true)
})

function noticeFromPush(data) {
  try {
    return data?.json() ?? {}
  } catch {
    return {}
  }
}

self.addEventListener('push', (event) => {
  const notice = noticeFromPush(event.data)
  const titles = self.axiaPushTitles
  const body =
    typeof notice?.type === 'string' && Object.hasOwn(titles, notice.type)
      ? titles[notice.type]
      : 'Tienes una nueva notificación en Axia.'
  const tag =
    typeof notice?.id === 'string' && /^[a-f0-9-]{36}$/i.test(notice.id)
      ? `axia-aviso-${notice.id}`
      : 'axia-avisos'

  event.waitUntil(
    self.registration.showNotification('Axia', {
      body,
      icon: '/pwa-192.png',
      tag,
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
