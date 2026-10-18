import { TicketIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { useMediaQuery } from '@/lib/use-media-query'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { TicketList } from './ticket-list'
import { TicketPagination } from './ticket-pagination'
import { TicketTable } from './ticket-table'

interface TicketListPanelProps {
  isLoading: boolean
  isError: boolean
  items: TicketListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPage: (page: number) => void
}

/** Estados de la lista (cargando, error, vacío, con datos) + paginación. */
export function TicketListPanel({
  isLoading,
  isError,
  items,
  page,
  pageSize,
  total,
  totalPages,
  onPage,
}: TicketListPanelProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  if (isLoading) {
    return <LoadingList rows={6} />
  }
  if (isError) {
    return <ErrorAlert message={ticketMessages.errors.load} />
  }
  if (items.length === 0) {
    return <EmptyState icon={TicketIcon} title={ticketMessages.list.empty} />
  }
  return (
    <>
      {isDesktop ? (
        <TicketTable items={items} />
      ) : (
        <TicketList items={items} showElapsed />
      )}
      <TicketPagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPage={onPage}
      />
    </>
  )
}
