import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PauseSubstateRow, RejectCancelRow } from '../domain/indicators'
import type {
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsSummary,
  PauseReasonRow,
} from '../domain/metrics'
import { averageOf, formatMinutes, formatPercent } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DuplicateTable } from './duplicate-table'
import { PausesChart } from './pauses-chart'
import { PauseSubstates } from './pause-substates'
import { RejectCancelTable } from './reject-cancel-chart'

const t = metricsMessages.quality
const duplicateMessages = metricsMessages.duplicates

type ReasonsView = 'pauses' | 'duplicates' | 'rejectCancel'

const VIEWS = [
  ['pauses', t.pausesTab],
  ['duplicates', t.duplicatesTab],
  ['rejectCancel', t.rejectCancelTab],
] as const

function ViewSwitch({
  view,
  onChange,
}: {
  view: ReasonsView
  onChange: (view: ReasonsView) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {VIEWS.map(([value, label]) => (
        <Button
          key={value}
          type="button"
          variant={view === value ? 'secondary' : 'ghost'}
          aria-pressed={view === value}
          className="min-h-11 px-3 lg:min-h-8"
          onClick={() => onChange(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

function PausesContent({
  pauses,
  pauseSubstates,
}: {
  pauses: PauseReasonRow[]
  pauseSubstates: PauseSubstateRow[]
}) {
  return (
    <ChartCard
      title={metricsMessages.charts.pauses}
      hint={metricsMessages.chartHints.pauses}
    >
      <div className="flex flex-col gap-4">
        <PausesChart data={pauses} />
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t.substates}
          </h3>
          <PauseSubstates rows={pauseSubstates} />
        </div>
      </div>
    </ChartCard>
  )
}

function DuplicateStats({
  summary,
  duplicates,
}: {
  summary: MetricsSummary
  duplicates: { tickets: DuplicateTicket[]; alerts: DuplicateAlert[] }
}) {
  const decisions = duplicateMessages.decisions as Record<string, string>
  const average = averageOf(
    duplicates.tickets.map((item) => item.timeToMarkMinutes),
  )
  const rate = summary.tickets > 0 ? summary.duplicate / summary.tickets : 0
  return (
    <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
      <div className="flex items-baseline gap-2">
        <dt className="text-muted-foreground">
          {duplicateMessages.duplicateRate}
        </dt>
        <dd className="font-semibold tabular-nums">{formatPercent(rate)}</dd>
      </div>
      <div className="flex items-baseline gap-2">
        <dt className="text-muted-foreground">
          {duplicateMessages.timeToMark}
        </dt>
        <dd className="font-semibold tabular-nums">{formatMinutes(average)}</dd>
      </div>
      {duplicates.alerts.map((alert) => (
        <div key={alert.decision} className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">
            {decisions[alert.decision] ?? alert.decision}
          </dt>
          <dd className="font-semibold tabular-nums">{alert.candidates}</dd>
        </div>
      ))}
    </dl>
  )
}

function DuplicatesContent({
  summary,
  duplicates,
}: {
  summary: MetricsSummary
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
}) {
  return (
    <section className="flex flex-col gap-3">
      <DuplicateStats summary={summary} duplicates={duplicates} />
      <DuplicateTable rows={duplicates.rows} />
    </section>
  )
}

function RejectCancelContent({ rows }: { rows: RejectCancelRow[] }) {
  return (
    <ChartCard
      title={metricsMessages.rejectCancel.title}
      hint={metricsMessages.chartHints.rejectCancel}
    >
      <RejectCancelTable rows={rows} />
    </ChartCard>
  )
}

/** Motivos y salidas: pausas, duplicados y descartes. */
export function QualityReasons({
  summary,
  pauses,
  pauseSubstates,
  duplicates,
  rejectCancel,
}: {
  summary: MetricsSummary
  pauses: PauseReasonRow[]
  pauseSubstates: PauseSubstateRow[]
  duplicates: {
    tickets: DuplicateTicket[]
    alerts: DuplicateAlert[]
    rows: DuplicateDimensionRow[]
  }
  rejectCancel: RejectCancelRow[]
}) {
  const [view, setView] = useState<ReasonsView>('pauses')
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium">{t.reasons}</h2>
        <ViewSwitch view={view} onChange={setView} />
      </div>
      {view === 'pauses' ? (
        <PausesContent pauses={pauses} pauseSubstates={pauseSubstates} />
      ) : null}
      {view === 'duplicates' ? (
        <DuplicatesContent summary={summary} duplicates={duplicates} />
      ) : null}
      {view === 'rejectCancel' ? (
        <RejectCancelContent rows={rejectCancel} />
      ) : null}
    </section>
  )
}
