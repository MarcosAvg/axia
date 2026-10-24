import { queryClient } from '@/app/query-client'
// Importaciones directas: el índice de `features/tickets` reexporta toda la
// interfaz del feature y arrancar la cola no debe cargarla (ADR 0083).
import { registerEvidenceUploadHandler } from '@/features/tickets/api/offline-evidence'
import { registerTicketActionHandler } from '@/features/tickets/api/offline-actions'
import { onOutboxProcessed, processOutbox } from '@/lib/offline/outbox'
import { startSync } from '@/lib/offline/sync'

/** Registra los manejadores de la cola offline y arranca la sincronización. */
export function setupOffline(): () => void {
  registerEvidenceUploadHandler()
  registerTicketActionHandler()
  onOutboxProcessed(() => {
    void queryClient.invalidateQueries({ queryKey: ['tickets'] })
  })
  return startSync(processOutbox)
}
