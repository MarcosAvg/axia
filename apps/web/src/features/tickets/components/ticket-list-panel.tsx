import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { TicketList } from './ticket-list'
import { TicketPagination } from './ticket-pagination'

interface TicketListPanelProps {
  isLoading: boolean
  isError: boolean
  items: TicketListItem[]
  page: number
  totalPages: number
  onPage: (page: number) => void
}

/** Estados de la lista (cargando, error, vacío, con datos) + paginación. */
export function TicketListPanel({
  isLoading,
  isError,
  items,
  page,
  totalPages,
  onPage,
}: TicketListPanelProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{ticketMessages.loading}</p>
    )
  }
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ticketMessages.errors.load}
      </p>
    )
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ticketMessages.list.empty}
      </p>
    )
  }
  return (
    <>
      <TicketList items={items} />
      <TicketPagination page={page} totalPages={totalPages} onPage={onPage} />
    </>
  )
}
