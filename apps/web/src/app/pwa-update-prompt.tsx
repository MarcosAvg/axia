import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/i18n'

// Aviso de actualización de la PWA (`registerType: 'prompt'`): la nueva versión
// se aplica solo cuando la persona lo confirma, nunca a mitad de un trabajo.
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW()
  const [dismissed, setDismissed] = useState(false)

  if ((!needRefresh && !offlineReady) || dismissed) {
    return null
  }

  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg">
        <p className="flex-1 text-sm">
          {needRefresh
            ? messages.pwa.updateAvailable
            : messages.pwa.offlineReady}
        </p>
        {needRefresh ? (
          <Button
            className="min-h-11"
            onClick={() => void updateServiceWorker()}
          >
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
