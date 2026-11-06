import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { TicketBoard } from './ticket-board'

interface TicketBoardPanelProps {
  isLoading: boolean
  isError: boolean
  items: TicketListItem[]
  /** Total de la consulta; si supera lo cargado, se avisa que el tablero está limitado. */
  total?: number
  offeredIds?: ReadonlySet<string>
}

/** Estados de carga, error y aviso de límite alrededor del tablero. */
export function TicketBoardPanel({
  isLoading,
  isError,
  items,
  total,
  offeredIds,
}: TicketBoardPanelProps) {
  if (isLoading) return <LoadingList rows={4} />
  if (isError) return <ErrorAlert message={ticketMessages.errors.load} />

  return (
    <div className="flex flex-col gap-3">
      {total !== undefined && total > items.length ? (
        <p className="text-sm text-muted-foreground">
          {ticketMessages.board.truncated(items.length, total)}
        </p>
      ) : null}
      <TicketBoard items={items} offeredIds={offeredIds} />
    </div>
  )
}
