import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  RejectCancelRow,
  RoutingSummary,
  TechnicianRow,
} from '../domain/indicators'
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
import { TeamTab } from './team-tab'
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
  technicians: TechnicianRow[]
  rejectCancel: RejectCancelRow[]
  routing: RoutingSummary
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
  technicians,
  rejectCancel,
  routing,
}: MetricsTabsProps) {
  const { tabs } = metricsMessages
  return (
    <Tabs defaultValue="summary" className="flex flex-col gap-4">
      <TabsList className="flex-wrap">
        {(['summary', 'times', 'quality', 'sla', 'team'] as const).map(
          (value) => (
            <TabsTrigger key={value} value={value} className="min-h-9">
              {tabs[value]}
            </TabsTrigger>
          ),
        )}
      </TabsList>
      <TabsContent value="summary">
        <SummaryTab
          filtered={filtered}
          rows={rows}
          nameOf={nameOf}
          routing={routing}
        />
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
          rejectCancel={rejectCancel}
        />
      </TabsContent>
      <TabsContent value="sla">
        <SlaTab sla={sla} slaRows={slaRows} satisfaction={satisfaction} />
      </TabsContent>
      <TabsContent value="team">
        <TeamTab technicians={technicians} />
      </TabsContent>
    </Tabs>
  )
}
