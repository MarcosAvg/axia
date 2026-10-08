import { queryClient } from '@/app/query-client'
import { registerEvidenceUploadHandler } from '@/features/tickets'
import { onOutboxProcessed, processOutbox } from '@/lib/offline/outbox'
import { startSync } from '@/lib/offline/sync'

/** Registra los manejadores de la cola offline y arranca la sincronización. */
export function setupOffline(): () => void {
  registerEvidenceUploadHandler()
  onOutboxProcessed(() => {
    void queryClient.invalidateQueries({ queryKey: ['tickets'] })
  })
  return startSync(processOutbox)
}
