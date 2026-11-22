import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/i18n'
import { useOnline } from '@/lib/use-online'

function usePwaUpdate() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>()
  const [activated, setActivated] = useState(false)
  const requested = useRef(false)
  const {
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, current) => setRegistration(current),
    // Workbox detecta la descarga. El cambio de control se observa en cada pestaña.
    onNeedReload: () => undefined,
  })

  useEffect(() => {
    const workers = navigator.serviceWorker
    if (!workers) return
    let previous = workers.controller
    const onControllerChange = () => {
      const current = workers.controller
      if (current && previous !== current) {
        if (requested.current) window.location.reload()
        else if (previous) setActivated(true)
      }
      previous = current
    }
    workers.addEventListener('controllerchange', onControllerChange)
    return () =>
      workers.removeEventListener('controllerchange', onControllerChange)
  }, [])

  const available = activated || Boolean(registration?.waiting)

  function applyUpdate() {
    if (registration?.waiting) {
      requested.current = true
      void updateServiceWorker().catch(() => {
        requested.current = false
      })
    } else if (activated) {
      window.location.reload()
    }
  }

  return { available, offlineReady, applyUpdate }
}

/** Ofrece la nueva versión sin interrumpir las otras pestañas abiertas. */
export function PwaUpdatePrompt() {
  const { available, offlineReady, applyUpdate } = usePwaUpdate()
  const [dismissed, setDismissed] = useState(false)
  const online = useOnline()
  if (!available && (!offlineReady || dismissed)) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[calc(1rem+3.5rem+var(--app-safe-bottom))] lg:pb-4"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg">
        <p className="flex-1 text-sm">
          {available ? messages.pwa.updateAvailable : messages.pwa.offlineReady}
        </p>
        {available ? (
          <Button className="min-h-11" onClick={applyUpdate} disabled={!online}>
            {messages.pwa.updateAction}
          </Button>
        ) : (
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => setDismissed(true)}
          >
            {messages.pwa.dismissAction}
          </Button>
        )}
      </div>
    </div>
  )
}
