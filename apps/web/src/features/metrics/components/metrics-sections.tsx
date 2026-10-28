import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/lib/use-media-query'
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

interface MetricsSectionsProps {
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

const SECTION_VALUES = ['summary', 'times', 'quality', 'sla', 'team'] as const

type SectionValue = (typeof SECTION_VALUES)[number]

function sectionNodes(
  props: MetricsSectionsProps,
): Record<SectionValue, ReactNode> {
  return {
    summary: (
      <SummaryTab
        volume={props.volume}
        aging={props.aging}
        groups={props.groups}
        nameOf={props.nameOf}
        routing={props.routing}
      />
    ),
    times: (
      <TimesTab
        summary={props.summary}
        comparison={props.comparison}
        groups={props.groups}
        nameOf={props.nameOf}
      />
    ),
    quality: (
      <QualityTab
        summary={props.summary}
        comparison={props.comparison}
        pauses={props.pauses}
        duplicates={props.duplicates}
        rejectCancel={props.rejectCancel}
      />
    ),
    sla: (
      <SlaTab
        sla={props.sla}
        slaRows={props.slaRows}
        satisfaction={props.satisfaction}
      />
    ),
    team: <TeamTab technicians={props.technicians} />,
  }
}

/** Anclas a las secciones: sustituyen a las pestañas en escritorio. */
function SectionNav() {
  return (
    <nav
      aria-label={metricsMessages.sectionsNav}
      className="sticky top-14 z-20 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6"
    >
      <ul className="flex flex-wrap items-center gap-1">
        {SECTION_VALUES.map((value) => (
          <li key={value}>
            <a
              href={`#metrics-${value}`}
              className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {metricsMessages.tabs[value]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Secciones del tablero: página completa con anclas en escritorio, pestañas en móvil. */
export function MetricsSections(props: MetricsSectionsProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const nodes = sectionNodes(props)

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-4">
        <SectionNav />
        {SECTION_VALUES.map((value) => (
          <section
            key={value}
            id={`metrics-${value}`}
            aria-labelledby={`metrics-${value}-title`}
            className="scroll-mt-28"
          >
            <h2
              id={`metrics-${value}-title`}
              className="mb-2 text-sm font-medium text-muted-foreground"
            >
              {metricsMessages.tabs[value]}
            </h2>
            {nodes[value]}
          </section>
        ))}
      </div>
    )
  }

  return (
    <Tabs defaultValue="summary" className="flex flex-col gap-4">
      <TabsList className="h-auto w-full flex-wrap justify-start">
        {SECTION_VALUES.map((value) => (
          <TabsTrigger key={value} value={value} className="min-h-11">
            {metricsMessages.tabs[value]}
          </TabsTrigger>
        ))}
      </TabsList>
      {SECTION_VALUES.map((value) => (
        <TabsContent key={value} value={value}>
          {nodes[value]}
        </TabsContent>
      ))}
    </Tabs>
  )
}
