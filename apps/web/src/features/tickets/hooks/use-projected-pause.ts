import { useReasons } from '@/features/catalogs'
import type { PendingTicketAction } from '../domain/pending-actions'
import { projectPause } from '../domain/project-pause'
import { useTicketPauseState } from './use-tickets'

export function useProjectedPause(
  ticketId: string | undefined,
  pending: PendingTicketAction[],
) {
  const { data: confirmed } = useTicketPauseState(ticketId)
  const { data: reasons } = useReasons('pause')
  return ticketId
    ? projectPause(confirmed ?? null, pending, reasons ?? [])
    : null
}
