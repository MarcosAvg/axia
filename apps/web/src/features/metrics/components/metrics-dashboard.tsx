import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs } from '@/components/ui/tabs'
import { useMetricsBoard } from '../hooks/use-metrics-board'
import { MetricsDrillDownProvider } from '../drill-down-context'
import { metricsMessages } from '../i18n'
import { MetricsExport } from './metrics-export'
import { MetricsTabList, MetricsTabs } from './metrics-tabs'
import { MetricsToolbar } from './metrics-toolbar'

/** Tablero de indicadores agrupado por tema. */
export function MetricsDashboard() {
  const board = useMetricsBoard()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={metricsMessages.title}
        description={metricsMessages.subtitle}
        actions={<MetricsExport groups={board.groups} mode={board.mode} />}
      />
      <Tabs defaultValue="summary" className="flex flex-col gap-6">
        <MetricsToolbar
          filters={board.filters}
          catalogs={board.catalogs}
          onFiltersChange={board.setFilters}
          tabs={board.summary.tickets > 0 ? <MetricsTabList /> : null}
          mode={board.mode}
          onModeChange={board.changeMode}
        />
        {board.loading ? <LoadingList rows={4} /> : null}
        {board.error ? <ErrorAlert message={metricsMessages.error} /> : null}
        {!board.loading && !board.error && board.summary.tickets === 0 ? (
          <p className="text-sm text-muted-foreground">
            {metricsMessages.empty}
          </p>
        ) : null}
        {board.summary.tickets > 0 ? (
          <MetricsDrillDownProvider filters={board.filters}>
            <MetricsTabs
              mode={board.mode}
              volume={board.volume}
              aging={board.aging}
              agingBuckets={board.agingBuckets}
              summary={board.summary}
              comparison={board.comparison}
              groups={board.groups}
              profile={board.profile}
              pauses={board.pauses}
              pauseSubstates={board.pauseSubstates}
              duplicates={board.duplicates}
              sla={board.sla}
              slaRows={board.slaRows}
              satisfaction={board.satisfaction}
              satisfactionDistribution={board.satisfactionDistribution}
              technicians={board.technicians}
              auxiliaryByCategory={board.auxiliaryByCategory}
              technicianTimes={board.technicianTimes}
              technicianSubjectTimes={board.technicianSubjectTimes}
              requesterTimes={board.requesterTimes}
              supervisors={board.supervisors}
              rejectCancel={board.rejectCancel}
              routing={board.routing}
            />
          </MetricsDrillDownProvider>
        ) : null}
      </Tabs>
    </div>
  )
}
