import { queryClient } from '@/app/query-client'
// Importaciones directas: el índice de `features/tickets` reexporta toda la
// interfaz del feature y arrancar la cola no debe cargarla (ADR 0083).
import {
  pruneRejectedEvidence,
  registerEvidenceUploadHandler,
} from '@/features/tickets/api/offline-evidence'
import { registerTicketActionHandler } from '@/features/tickets/api/offline-actions'
import { onOutboxProcessed, processOutbox } from '@/lib/offline/outbox'
import { startSync } from '@/lib/offline/sync'

function visibleTicketIds(queryType: unknown, data: unknown): string[] {
  if (queryType === 'my-work') {
    return (data as { id: string }[] | undefined)?.map(({ id }) => id) ?? []
  }
  if (queryType === 'list') {
    return (
      (data as { items: { id: string }[] } | undefined)?.items.map(
        ({ id }) => id,
      ) ?? []
    )
  }
  return []
}

function refreshConfirmedTickets(keys: readonly string[]) {
  const byTicket = new Map(keys.map((key) => [key, [] as Promise<void>[]]))
  const queries = queryClient.getQueryCache().findAll({ queryKey: ['tickets'] })
  for (const query of queries) {
    const [, type, id] = query.queryKey
    const related = new Set(visibleTicketIds(type, query.state.data))
    if (typeof id === 'string') related.add(id)
    const refresh = queryClient
      .invalidateQueries({ queryKey: query.queryKey, exact: true })
      .then(() => {
        if (query.isActive() && query.state.isInvalidated) {
          throw new Error('El tiquet sigue pendiente de actualizar')
        }
      })
    // Las consultas de otros tiquets también se invalidan en segundo plano.
    void refresh.catch(() => undefined)
    for (const key of related) byTicket.get(key)?.push(refresh)
  }
  return new Map(
    [...byTicket].map(([key, refreshes]) => [
      key,
      Promise.all(refreshes).then(() => undefined),
    ]),
  )
}

/** Registra los manejadores de la cola offline y arranca la sincronización. */
export function setupOffline(): () => void {
  registerEvidenceUploadHandler()
  registerTicketActionHandler()
  onOutboxProcessed(refreshConfirmedTickets)
  return startSync(async () => {
    await processOutbox()
    await pruneRejectedEvidence().catch(() => undefined)
  })
}
