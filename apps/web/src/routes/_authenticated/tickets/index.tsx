import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { can, RequirePermission, useAuth } from '@/features/auth'
import { useBuildings, useCategories } from '@/features/catalogs'
import {
  TicketFilters,
  TicketListPanel,
  ticketMessages,
  ticketPageInfo,
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

function TicketsPage() {
  const { identity } = useAuth()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const buildings = useBuildings()
  const categories = useCategories()
  const query = useTicketsList(
    {
      status: search.status,
      buildingId: search.buildingId,
      categoryId: search.categoryId,
      search: search.search,
    },
    search.page,
  )
  const page = ticketPageInfo(query.data)
  const applySearch = (next: TicketListSearch) => {
    void navigate({ to: '/tickets', search: next })
  }

  return (
    <RequirePermission permission="ticket.view">
      <div className="flex flex-col gap-4">
        <PageHeader
          title={ticketMessages.list.title}
          description={ticketMessages.list.subtitle}
          actions={
            can(identity, 'ticket.create') ? (
              <Button asChild className="min-h-11">
                <Link to="/tickets/nuevo">{ticketMessages.list.newAction}</Link>
              </Button>
            ) : undefined
          }
        />
        <TicketFilters
          value={search}
          onChange={applySearch}
          buildings={buildings.data ?? []}
          categories={categories.data ?? []}
        />
        {query.data ? (
          <p className="text-sm text-muted-foreground">
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
      </div>
    </RequirePermission>
  )
}
