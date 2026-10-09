import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import type {
  RejectCancelRow,
  RoutingSummary,
  TechnicianRow,
} from '../domain/indicators'
import type {
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
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { QualityTab } from './quality-tab'
import { SlaTab } from './sla-tab'
import { SummaryTab } from './summary-tab'
import { TeamTab } from './team-tab'
import { TimesTab } from './times-tab'

interface MetricsTabsProps {
  filtered: MetricsTicket[]
  summary: MetricsSummary
  comparison: Comparison | null
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
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
  comparison,
  groups,
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
          groups={groups}
          nameOf={nameOf}
          routing={routing}
        />
      </TabsContent>
      <TabsContent value="times">
        <TimesTab summary={summary} comparison={comparison} />
      </TabsContent>
      <TabsContent value="quality">
        <QualityTab
          summary={summary}
          comparison={comparison}
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
