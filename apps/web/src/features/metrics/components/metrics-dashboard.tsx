import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { PageHeader } from '@/components/shared/page-header'
import { useMetricsBoard } from '../hooks/use-metrics-board'
import { metricsMessages } from '../i18n'
import { MetricsExport } from './metrics-export'
import { MetricsHero } from './metrics-hero'
import { MetricsSections } from './metrics-sections'
import { MetricsToolbar } from './metrics-toolbar'

/** Tablero de indicadores agrupado por tema. */
export function MetricsDashboard() {
  const board = useMetricsBoard()
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={metricsMessages.title}
        description={metricsMessages.subtitle}
        actions={<MetricsExport groups={board.groups} nameOf={board.nameOf} />}
      />
      <MetricsToolbar
        filters={board.filters}
        catalogs={board.catalogs}
        onFiltersChange={board.setFilters}
      />
      {board.loading ? <LoadingList rows={4} /> : null}
      {board.error ? <ErrorAlert message={metricsMessages.error} /> : null}
      {!board.loading && !board.error && board.summary.tickets === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : null}
      {board.summary.tickets > 0 ? (
        <>
          <MetricsHero
            summary={board.summary}
            comparison={board.comparison}
            satisfaction={board.satisfaction}
            sla={board.sla}
          />
          <MetricsSections
            volume={board.volume}
            aging={board.aging}
            summary={board.summary}
            comparison={board.comparison}
            groups={board.groups}
            nameOf={board.nameOf}
            pauses={board.pauses}
            duplicates={board.duplicates}
            sla={board.sla}
            slaRows={board.slaRows}
            satisfaction={board.satisfaction}
            technicians={board.technicians}
            rejectCancel={board.rejectCancel}
            routing={board.routing}
          />
        </>
      ) : null}
    </div>
  )
}
