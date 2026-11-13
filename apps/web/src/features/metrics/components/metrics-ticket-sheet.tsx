import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftRightIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TicketList, ticketPageInfo, useTicketsList } from '@/features/tickets'
import type { DrillDownSpec } from '../domain/drill-down'
import { toTicketSearch } from '../domain/drill-down'
import { metricsMessages } from '../i18n'

const t = metricsMessages.drillDown

type PageInfo = ReturnType<typeof ticketPageInfo>

function SheetResults({
  query,
  info,
}: {
  query: ReturnType<typeof useTicketsList>
  info: PageInfo
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {query.isLoading ? <LoadingList rows={5} /> : null}
      {query.isError ? (
        <ErrorAlert
          message={t.error}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              {t.retry}
            </Button>
          }
        />
      ) : null}
      {!query.isLoading && !query.isError && info.items.length === 0 ? (
        <EmptyState title={t.empty} />
      ) : null}
      {info.items.length > 0 ? (
        <TicketList items={info.items} showElapsed />
      ) : null}
    </div>
  )
}

function SheetPages({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(Math.max(1, page - 1))}
      >
        {t.previous}
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {t.page(Math.min(page, totalPages), totalPages)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t.next}
      </Button>
    </div>
  )
}

function SheetBody({
  spec,
  onOpen,
}: {
  spec: DrillDownSpec
  onOpen: (spec: DrillDownSpec) => void
}) {
  const [page, setPage] = useState(1)
  const query = useTicketsList(spec.filters, page)
  const info = ticketPageInfo(query.data)
  // Ajuste derivado: si la lista se reduce, la página solicitada vuelve al rango.
  if (page > info.totalPages) setPage(info.totalPages)
  const alternate = spec.alternate

  return (
    <SheetContent
      side="right"
      className="gap-0 sm:max-w-2xl"
      aria-describedby="metrics-drilldown-description"
    >
      <SheetHeader className="border-b pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle>{spec.title}</SheetTitle>
            <SheetDescription id="metrics-drilldown-description">
              {query.data ? t.count(info.total) : t.note}
            </SheetDescription>
          </div>
          {alternate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              title={t.invertHint}
              onClick={() =>
                onOpen({
                  ...alternate,
                  alternate: { title: spec.title, filters: spec.filters },
                })
              }
            >
              <ArrowLeftRightIcon />
              {t.invert}
            </Button>
          ) : null}
        </div>
      </SheetHeader>
      <SheetResults query={query} info={info} />
      <SheetFooter className="border-t">
        <p className="text-xs text-muted-foreground">{t.note}</p>
        <SheetPages page={page} totalPages={info.totalPages} onPage={setPage} />
        <Button asChild variant="secondary" className="min-h-11">
          <Link to="/tickets" search={toTicketSearch(spec.filters)}>
            {t.fullList}
          </Link>
        </Button>
      </SheetFooter>
    </SheetContent>
  )
}

/** Panel lateral con los tiquets que explican un número del tablero. */
export function MetricsTicketSheet({
  spec,
  onClose,
  onOpen,
}: {
  spec: DrillDownSpec | null
  onClose: () => void
  onOpen: (spec: DrillDownSpec) => void
}) {
  return (
    <Sheet open={spec !== null} onOpenChange={(open) => !open && onClose()}>
      {spec ? (
        <SheetBody
          key={`${spec.title}:${JSON.stringify(spec.filters)}`}
          spec={spec}
          onOpen={onOpen}
        />
      ) : null}
    </Sheet>
  )
}
