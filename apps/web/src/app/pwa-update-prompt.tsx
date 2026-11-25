import { LoaderCircleIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { messages } from '@/lib/i18n'
import { useOnline } from '@/lib/use-online'

const ACTIVATION_TIMEOUT_MS = 15_000

function usePwaUpdate() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>()
  const [waiting, setWaiting] = useState(false)
  const [activated, setActivated] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'applying' | 'failed'>('idle')
  const requested = useRef<symbol | null>(null)
  const {
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, current) => setRegistration(current),
    // Workbox detecta la descarga. El cambio de control se observa en cada pestaña.
    onNeedReload: () => setWaiting(true),
  })

  useEffect(() => {
    const workers = navigator.serviceWorker
    if (!workers) return
    let previous = workers.controller
    const onControllerChange = () => {
      const current = workers.controller
      if (current && previous !== current) {
        setWaiting(false)
        if (requested.current) window.location.reload()
        else if (previous) setActivated(true)
      }
      previous = current
    }
    workers.addEventListener('controllerchange', onControllerChange)
    return () =>
      workers.removeEventListener('controllerchange', onControllerChange)
  }, [])

  useEffect(() => {
    if (phase !== 'applying') return
    const timer = window.setTimeout(() => {
      requested.current = null
      setPhase('failed')
    }, ACTIVATION_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  const available = activated || waiting || Boolean(registration?.waiting)

  function applyUpdate() {
    if (registration?.waiting) {
      const attempt = Symbol()
      requested.current = attempt
      setPhase('applying')
      void updateServiceWorker().catch(() => {
        if (requested.current !== attempt) return
        requested.current = null
        setPhase('failed')
      })
    } else if (activated) {
      window.location.reload()
    }
  }

  return { available, offlineReady, applyUpdate, phase }
}

function UpdateLoading({
  onCloseAutoFocus,
}: {
  onCloseAutoFocus: (event: Event) => void
}) {
  return (
    <Dialog open>
      <DialogContent
        className="w-[calc(100%_-_2rem)] max-w-sm justify-items-center gap-3 px-6 py-8 text-center"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-7 text-primary motion-safe:animate-spin"
        />
        <DialogTitle>{messages.pwa.updating}</DialogTitle>
        <DialogDescription>
          {messages.pwa.updatingDescription}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}

/** Ofrece la nueva versión sin interrumpir las otras pestañas abiertas. */
export function PwaUpdatePrompt() {
  const { available, offlineReady, applyUpdate, phase } = usePwaUpdate()
  const updateButton = useRef<HTMLButtonElement>(null)
  const [dismissed, setDismissed] = useState(false)
  const online = useOnline()
  const failed = phase === 'failed'
  if (phase === 'applying') {
    return (
      <UpdateLoading
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          updateButton.current?.focus()
        }}
      />
    )
  }
  if (!available && (dismissed || (!offlineReady && !failed))) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[calc(1rem+3.5rem+var(--app-safe-bottom))] lg:pb-4"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg">
        <p className="flex-1 text-sm">
          {failed
            ? messages.pwa.updateFailed
            : available
              ? messages.pwa.updateAvailable
              : messages.pwa.offlineReady}
        </p>
        {available ? (
          <Button
            ref={updateButton}
            className="min-h-11"
            onClick={applyUpdate}
            disabled={!online}
          >
            {failed ? messages.offline.retry : messages.pwa.updateAction}
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
