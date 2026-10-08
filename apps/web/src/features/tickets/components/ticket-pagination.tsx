import { Button } from '@/components/ui/button'
import { ticketMessages } from '../i18n'

interface TicketPaginationProps {
  page: number
  totalPages: number
  onPage: (page: number) => void
}

/** Controles de paginación de la lista de tiquets. */
export function TicketPagination({
  page,
  totalPages,
  onPage,
}: TicketPaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {ticketMessages.list.previous}
      </Button>
      <span className="text-sm text-muted-foreground">
        {ticketMessages.list.page(page)}
      </span>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {ticketMessages.list.next}
      </Button>
    </div>
  )
}
