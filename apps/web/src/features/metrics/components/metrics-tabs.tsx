import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DimensionGroup } from '../domain/dimensions'
import type {
  PauseSubstateRow,
  RejectCancelRow,
  RoutingSummary,
  SupervisorRow,
  TechnicianRow,
  TechnicianTimeRow,
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
import { DistributionTab } from './distribution-tab'
import { QualityTab } from './quality-tab'
import { SummaryTab } from './summary-tab'
import { TeamTab } from './team-tab'
import { TimesTab } from './times-tab'

interface MetricsTabsProps {
  volume: VolumePoint[]
  aging: AgingRow[]
  summary: MetricsSummary
  comparison: Comparison | null
  groups: DimensionGroup[]
  pauses: PauseReasonRow[]
  pauseSubstates: PauseSubstateRow[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
  satisfaction: SatisfactionSummary
  satisfactionDistribution: number[]
  technicians: TechnicianRow[]
  technicianTimes: TechnicianTimeRow[]
  supervisors: SupervisorRow[]
  rejectCancel: RejectCancelRow[]
  routing: RoutingSummary
}

const TAB_VALUES = [
  'summary',
  'distribution',
  'times',
  'quality',
  'team',
] as const

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
export function MetricsTabs(props: MetricsTabsProps) {
  return (
    <Tabs defaultValue="summary" className="flex flex-col gap-4">
      <MetricsTabList />
      <TabsContent value="summary">
        <SummaryTab
          volume={props.volume}
          aging={props.aging}
          groups={props.groups}
          summary={props.summary}
          comparison={props.comparison}
          satisfaction={props.satisfaction}
          satisfactionDistribution={props.satisfactionDistribution}
          sla={props.sla}
          slaRows={props.slaRows}
        />
      </TabsContent>
      <TabsContent value="distribution">
        <DistributionTab groups={props.groups} />
      </TabsContent>
      <TabsContent value="times">
        <TimesTab
          summary={props.summary}
          groups={props.groups}
          technicians={props.technicians}
          technicianTimes={props.technicianTimes}
        />
      </TabsContent>
      <TabsContent value="quality">
        <QualityTab
          summary={props.summary}
          comparison={props.comparison}
          groups={props.groups}
          pauses={props.pauses}
          pauseSubstates={props.pauseSubstates}
          duplicates={props.duplicates}
          rejectCancel={props.rejectCancel}
        />
      </TabsContent>
      <TabsContent value="team">
        <TeamTab
          groups={props.groups}
          routing={props.routing}
          supervisors={props.supervisors}
          technicians={props.technicians}
        />
      </TabsContent>
    </Tabs>
  )
}
