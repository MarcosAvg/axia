import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { QualityTab } from './quality-tab'
import { SlaTab } from './sla-tab'
import { SummaryTab } from './summary-tab'
import { TimesTab } from './times-tab'

interface MetricsTabsProps {
  filtered: MetricsTicket[]
  summary: MetricsSummary
  prev: MetricsSummary | null
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
  prev,
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
        <TimesTab summary={summary} prev={prev} rows={rows} nameOf={nameOf} />
      </TabsContent>
      <TabsContent value="quality">
        <QualityTab
          summary={summary}
          prev={prev}
          pauses={pauses}
          duplicates={duplicates}
        />
      </TabsContent>
      <TabsContent value="sla">
        <SlaTab sla={sla} slaRows={slaRows} satisfaction={satisfaction} />
      </TabsContent>
    </Tabs>
  )
}
