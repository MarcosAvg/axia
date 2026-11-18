import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from 'cn'
import type { DimensionGroup } from '../domain/dimensions'
import type {
  AuxiliaryCategoryRow,
  PauseSubstateRow,
  RejectCancelRow,
  RequesterTimeRow,
  RoutingSummary,
  SupervisorRow,
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import type {
  AgingRow,
  DistributionProfileRow,
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
  mode: import('../domain/time-mode').TimeMode
  volume: VolumePoint[]
  aging: AgingRow[]
  agingBuckets: Array<{ bucket: string; tickets: number }>
  summary: MetricsSummary
  comparison: Comparison | null
  groups: DimensionGroup[]
  profile: DistributionProfileRow[]
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
  auxiliaryByCategory: AuxiliaryCategoryRow[]
  technicianTimes: TechnicianTimeRow[]
  technicianSubjectTimes: TechnicianSubjectTimeRow[]
  requesterTimes: RequesterTimeRow[]
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

/** Selector de pestañas del tablero; se muestra junto a los filtros. */
export function MetricsTabList() {
  return (
    <TabsList className="col-span-2 grid h-auto w-full grid-cols-6 rounded-lg bg-muted/50 p-1 sm:grid-cols-5 lg:inline-flex lg:w-fit lg:flex-wrap lg:justify-start">
      {TAB_VALUES.map((value, index) => (
        <TabsTrigger
          key={value}
          value={value}
          className={cn(
            'min-h-11 px-1 max-sm:text-xs lg:min-h-9 lg:px-4',
            index < 3 ? 'max-sm:col-span-2' : 'max-sm:col-span-3',
          )}
        >
          {metricsMessages.tabs[value]}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

/** Paneles del tablero por tema. */
export function MetricsTabs(props: MetricsTabsProps) {
  return (
    <>
      <TabsContent value="summary">
        <SummaryTab
          mode={props.mode}
          volume={props.volume}
          aging={props.aging}
          agingBuckets={props.agingBuckets}
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
        <DistributionTab groups={props.groups} mode={props.mode} />
      </TabsContent>
      <TabsContent value="times">
        <TimesTab
          summary={props.summary}
          mode={props.mode}
          groups={props.groups}
          profile={props.profile}
          technicians={props.technicians}
          technicianTimes={props.technicianTimes}
          technicianSubjectTimes={props.technicianSubjectTimes}
          requesterTimes={props.requesterTimes}
        />
      </TabsContent>
      <TabsContent value="quality">
        <QualityTab
          summary={props.summary}
          comparison={props.comparison}
          groups={props.groups}
          profile={props.profile}
          pauses={props.pauses}
          pauseSubstates={props.pauseSubstates}
          duplicates={props.duplicates}
          rejectCancel={props.rejectCancel}
          mode={props.mode}
        />
      </TabsContent>
      <TabsContent value="team">
        <TeamTab
          mode={props.mode}
          auxiliaryByCategory={props.auxiliaryByCategory}
          groups={props.groups}
          routing={props.routing}
          supervisors={props.supervisors}
          technicians={props.technicians}
        />
      </TabsContent>
    </>
  )
}
