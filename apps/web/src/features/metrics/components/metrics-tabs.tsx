import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { statusLabels } from '@/features/tickets'
import {
  formatMinutes,
  formatPercent,
  formatRate,
  formatScore,
  openAging,
  volumeByDate,
} from '../domain/metrics'
import type {
  DimensionRow,
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsSummary,
  MetricsTicket,
  PauseReasonRow,
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
} from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { DimensionChart } from './dimension-chart'
import { DimensionTable } from './dimension-table'
import { DuplicatesSection } from './duplicates-section'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'
import { PausesChart } from './pauses-chart'
import { SlaSection } from './sla-section'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

function timeCards(summary: MetricsSummary): Kpi[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  return [
    { label: k.active, value: formatMinutes(summary.avgActive) },
    {
      label: k.activeExtra,
      value: formatMinutes(summary.avgActiveExtra),
      hint: hints.activeExtra,
    },
    { label: k.total, value: formatMinutes(summary.avgTotal) },
    { label: k.net, value: formatMinutes(summary.avgNet) },
    { label: k.response, value: formatMinutes(summary.avgResponse) },
    { label: k.assignment, value: formatMinutes(summary.avgAssignment) },
    { label: k.validation, value: formatMinutes(summary.avgValidation) },
  ]
}

function qualityCards(summary: MetricsSummary): Kpi[] {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  return [
    { label: k.reassignment, value: formatPercent(summary.reassignmentRate) },
    { label: k.recapture, value: formatPercent(summary.recaptureRate) },
    { label: k.reopen, value: formatPercent(summary.reopenRate) },
    {
      label: k.firstFix,
      value: formatPercent(summary.firstTimeFixRate),
      hint: hints.firstFix,
    },
  ]
}

function SummaryTab({
  filtered,
  rows,
  nameOf,
}: {
  filtered: MetricsTicket[]
  rows: DimensionRow[]
  nameOf: (id: string) => string
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={metricsMessages.charts.volume}>
          <VolumeChart data={volumeByDate(filtered)} />
        </ChartCard>
        <ChartCard title={metricsMessages.charts.byDimension}>
          <DimensionChart rows={rows} nameOf={nameOf} />
        </ChartCard>
      </div>
      <ChartCard title={metricsMessages.aging.title}>
        <AgingList
          rows={openAging(filtered, new Date()).slice(0, 8)}
          statusLabel={statusLabel}
        />
      </ChartCard>
    </div>
  )
}

function TimesTab({
  summary,
  rows,
  nameOf,
}: {
  summary: MetricsSummary
  rows: DimensionRow[]
  nameOf: (id: string) => string
}) {
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid cards={timeCards(summary)} columns={4} />
      <ChartCard title={metricsMessages.table.dimension}>
        <DimensionTable rows={rows} nameOf={nameOf} />
      </ChartCard>
    </div>
  )
}

function QualityTab({
  summary,
  pauses,
  duplicates,
}: {
  summary: MetricsSummary
  pauses: PauseReasonRow[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
}) {
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid cards={qualityCards(summary)} columns={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={metricsMessages.charts.pauses}>
          <PausesChart data={pauses} />
        </ChartCard>
        <ChartCard title={metricsMessages.duplicates.title}>
          <DuplicatesSection {...duplicates} />
        </ChartCard>
      </div>
    </div>
  )
}

interface MetricsTabsProps {
  filtered: MetricsTicket[]
  summary: MetricsSummary
  rows: DimensionRow[]
  nameOf: (id: string) => string
  pauses: PauseReasonRow[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
  satisfaction: SatisfactionSummary
}

/** Pestañas del tablero por tema. */
export function MetricsTabs({
  filtered,
  summary,
  rows,
  nameOf,
  pauses,
  duplicates,
  sla,
  slaRows,
  satisfaction,
}: MetricsTabsProps) {
  const { tabs } = metricsMessages
  return (
    <Tabs defaultValue="summary" className="flex flex-col gap-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="summary" className="min-h-9">
          {tabs.summary}
        </TabsTrigger>
        <TabsTrigger value="times" className="min-h-9">
          {tabs.times}
        </TabsTrigger>
        <TabsTrigger value="quality" className="min-h-9">
          {tabs.quality}
        </TabsTrigger>
        <TabsTrigger value="sla" className="min-h-9">
          {tabs.sla}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="summary">
        <SummaryTab filtered={filtered} rows={rows} nameOf={nameOf} />
      </TabsContent>
      <TabsContent value="times">
        <TimesTab summary={summary} rows={rows} nameOf={nameOf} />
      </TabsContent>
      <TabsContent value="quality">
        <QualityTab summary={summary} pauses={pauses} duplicates={duplicates} />
      </TabsContent>
      <TabsContent value="sla">
        <SlaTab sla={sla} slaRows={slaRows} satisfaction={satisfaction} />
      </TabsContent>
    </Tabs>
  )
}

function SlaTab({
  sla,
  slaRows,
  satisfaction,
}: {
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
  satisfaction: SatisfactionSummary
}) {
  const k = metricsMessages.kpi
  const hints = metricsMessages.kpiHints
  const cards: Kpi[] = [
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid cards={cards} columns={4} />
      <ChartCard title={metricsMessages.sla.title}>
        <SlaSection rows={slaRows} />
      </ChartCard>
    </div>
  )
}
