import { Button } from '@/components/ui/button'
import type { TicketListSearch } from '../schemas'
import {
  hasInheritedTicketFilters,
  withoutInheritedTicketFilters,
} from '../domain/list-filters'
import { ticketMessages } from '../i18n'

/** Aviso y limpieza de los filtros que llegan desde Métricas. */
export function InheritedFiltersNotice({
  search,
  onClear,
}: {
  search: TicketListSearch
  onClear: (search: TicketListSearch) => void
}) {
  if (!hasInheritedTicketFilters(search)) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>{ticketMessages.list.inherited}</span>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0"
        onClick={() => onClear(withoutInheritedTicketFilters(search))}
      >
        {ticketMessages.list.clearInherited}
      </Button>
    </div>
  )
}
