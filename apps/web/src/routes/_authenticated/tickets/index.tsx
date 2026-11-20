import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { can, RequirePermission, useAuth } from '@/features/auth'
import {
  InheritedFiltersNotice,
  TicketFilters,
  TicketListPanel,
  ticketFiltersFromSearch,
  ticketMessages,
  ticketPageInfo,
  useTicketFilterCatalogs,
  useTicketsList,
} from '@/features/tickets'
// El esquema se importa directo: `validateSearch` vive en el módulo de la ruta,
// que se carga al arrancar. Pasar por el índice del feature arrastraría toda su
// interfaz a `/login` (ADR 0083).
import { ticketListSearchSchema } from '@/features/tickets/schemas'
import type { TicketListSearch } from '@/features/tickets/schemas'

export const Route = createFileRoute('/_authenticated/tickets/')({
  validateSearch: (search: Record<string, unknown>) =>
    ticketListSearchSchema.parse(search),
  component: TicketsPage,
})

function NewTicketLink() {
  return (
    <Button asChild className="min-h-11">
      <Link to="/tickets/nuevo">
        <PlusIcon aria-hidden />
        {ticketMessages.list.newAction}
      </Link>
    </Button>
  )
}

function TicketsPage() {
  const { identity } = useAuth()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const catalogs = useTicketFilterCatalogs()
  const query = useTicketsList(ticketFiltersFromSearch(search), search.page)
  const page = ticketPageInfo(query.data)
  const applySearch = (next: TicketListSearch) => {
    void navigate({ to: '/tickets', search: next })
  }

  return (
    <RequirePermission permission="ticket.view">
      <div className="flex flex-col gap-5 lg:gap-6">
        <PageHeader
          title={ticketMessages.list.title}
          description={ticketMessages.list.subtitle}
          actions={
            can(identity, 'ticket.create') ? <NewTicketLink /> : undefined
          }
        />
        <div className="space-y-3">
          <TicketFilters
            value={search}
            onChange={applySearch}
            catalogs={catalogs}
          />
          <InheritedFiltersNotice
            search={search}
            onClear={(next) => applySearch({ ...next, page: 1 })}
          />
        </div>
        <section aria-label={ticketMessages.list.results} className="space-y-3">
          {query.data ? (
            <p
              role="status"
              className="text-sm text-muted-foreground tabular-nums"
            >
              {ticketMessages.list.count(page.total)}
            </p>
          ) : null}
          <TicketListPanel
            isLoading={query.isLoading}
            isError={query.isError}
            items={page.items}
            page={search.page}
            pageSize={page.pageSize}
            total={page.total}
            totalPages={page.totalPages}
            onPage={(next) => applySearch({ ...search, page: next })}
          />
        </section>
      </div>
    </RequirePermission>
  )
}
