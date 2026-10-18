import { Button } from '@/components/ui/button'
import { ticketMessages } from '../i18n'

interface TicketPaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPage: (page: number) => void
}

/** Controles de paginación de la lista de tiquets. */
export function TicketPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPage,
}: TicketPaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
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
        {from}–{to} de {total} · {ticketMessages.list.page(page)} de{' '}
        {totalPages}
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
