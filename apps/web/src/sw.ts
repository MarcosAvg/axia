// Service worker de la PWA: precache, avisos push y actualización bajo confirmación.
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

import type { NotificationItem } from '@/features/notifications/domain/notification'
import { pushNotificationCopy } from '@/features/notifications/domain/notification'

declare let self: ServiceWorkerGlobalScope

type Notice = { id: string | null; type: string | null }

function noticeFromPush(data: PushMessageData | null): Notice {
  try {
    const value = data?.json() as { id?: unknown; type?: unknown } | undefined
    return {
      id: typeof value?.id === 'string' ? value.id : null,
      type: typeof value?.type === 'string' ? value.type : null,
    }
  } catch {
    return { id: null, type: null }
  }
}

async function fetchNotice(id: string): Promise<NotificationItem | null> {
  try {
    const response = await fetch(`/api/notifications/${id}`, {
      headers: { Accept: 'application/json' },
    })
    return response.ok ? ((await response.json()) as NotificationItem) : null
  } catch {
    return null
  }
}

async function showPush(notice: Notice) {
  const item = notice.id ? await fetchNotice(notice.id) : null
  const copy = pushNotificationCopy(notice.type, item)
  const tag =
    notice.id && /^[a-f0-9-]{36}$/i.test(notice.id)
      ? `axia-aviso-${notice.id}`
      : 'axia-avisos'
  await self.registration.showNotification(copy.title, {
    body: copy.body,
    icon: '/pwa-192.png',
    tag,
  })
}

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

self.addEventListener('message', (event) => {
  if (event.data === 'AXIA_PUSH_READY') event.ports[0]?.postMessage(true)
  if ((event.data as { type?: unknown } | null)?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

self.addEventListener('push', (event) => {
  event.waitUntil(showPush(noticeFromPush(event.data)))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const inbox = clients.find(
          (client) => new URL(client.url).pathname === '/avisos',
        )
        return inbox ? inbox.focus() : self.clients.openWindow('/avisos')
      }),
  )
})
