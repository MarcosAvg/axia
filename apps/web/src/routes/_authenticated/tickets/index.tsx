import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { RequirePermission } from '@/features/auth'
import { useBuildings, useCategories } from '@/features/catalogs'
import {
  TicketFilters,
  TicketListPanel,
  ticketListSearchSchema,
  ticketMessages,
  useTicketsList,
} from '@/features/tickets'
import type { TicketListSearch } from '@/features/tickets'

export const Route = createFileRoute('/_authenticated/tickets/')({
  validateSearch: (search: Record<string, unknown>) =>
    ticketListSearchSchema.parse(search),
  component: TicketsPage,
})

function TicketsPage() {
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
  const totalPages = Math.max(
    1,
    Math.ceil((query.data?.total ?? 0) / (query.data?.pageSize ?? 20)),
  )
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
            <Button asChild className="min-h-11">
              <Link to="/tickets/nuevo">{ticketMessages.list.newAction}</Link>
            </Button>
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
            {ticketMessages.list.count(query.data.total)}
          </p>
        ) : null}
        <TicketListPanel
          isLoading={query.isLoading}
          isError={query.isError}
          items={query.data?.items ?? []}
          page={search.page}
          totalPages={totalPages}
          onPage={(page) => applySearch({ ...search, page })}
        />
      </div>
    </RequirePermission>
  )
}
