import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import type {
  RejectCancelRow,
  RoutingSummary,
  TechnicianRow,
} from '../domain/indicators'
import type {
  AgingRow,
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsSummary,
  PauseReasonRow,
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
  VolumePoint,
} from '../domain/metrics'
import type { Comparison } from '../domain/period'
import { metricsMessages } from '../i18n'
import { QualityTab } from './quality-tab'
import { SlaTab } from './sla-tab'
import { SummaryTab } from './summary-tab'
import { TeamTab } from './team-tab'
import { TimesTab } from './times-tab'

interface MetricsTabsProps {
  volume: VolumePoint[]
  aging: AgingRow[]
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

const TAB_VALUES = ['summary', 'times', 'quality', 'sla', 'team'] as const

function MetricsTabList() {
  return (
    <TabsList className="h-auto flex-wrap justify-start">
      {TAB_VALUES.map((value) => (
        <TabsTrigger
          key={value}
          value={value}
          className="min-h-11 lg:min-h-9 lg:px-4"
        >
          {metricsMessages.tabs[value]}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

/** Pestañas del tablero por tema. */
export function MetricsTabs({
  volume,
  aging,
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
  return (
    <Tabs defaultValue="summary" className="flex flex-col gap-4">
      <MetricsTabList />
      <TabsContent value="summary">
        <SummaryTab
          volume={volume}
          aging={aging}
          groups={groups}
          nameOf={nameOf}
          routing={routing}
          summary={summary}
          comparison={comparison}
          satisfaction={satisfaction}
          sla={sla}
        />
      </TabsContent>
      <TabsContent value="times">
        <TimesTab summary={summary} groups={groups} nameOf={nameOf} />
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
