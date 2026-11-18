import { useRef } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { HintLabel } from '@/components/shared/hint'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type {
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { totalInMode, type TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'

const t = metricsMessages.times
const hints = metricsMessages.kpiHints

export type TechnicianView = TechnicianRow &
  Partial<TechnicianTimeRow> &
  Partial<TechnicianSubjectTimeRow>

export function formatTechnicianTime(
  value: number | undefined,
  labor: number | undefined,
  mode: TimeMode,
) {
  return value === undefined
    ? '—'
    : formatMinutes(totalInMode(value, labor ?? 0, mode))
}

function DurationRow({
  label,
  hint,
  value,
}: {
  label: string
  hint?: string
  value: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>
        <HintLabel label={label} hint={hint} />
      </dt>
      <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function LedDurations({ row, mode }: { row: TechnicianView; mode: TimeMode }) {
  return (
    <dl className="grid gap-1">
      <DurationRow
        label={metricsMessages.table.activeAverage}
        hint={hints.active}
        value={formatTechnicianTime(row.avgActive, row.avgActiveLabor, mode)}
      />
      <DurationRow
        label={metricsMessages.table.totalAverage}
        hint={metricsMessages.teamHints.technicianAvgTotal}
        value={formatTechnicianTime(row.avgTotal, row.avgTotalLabor, mode)}
      />
      <DurationRow
        label={t.averages.response}
        hint={hints.response}
        value={formatTechnicianTime(
          row.avgResponse,
          row.avgResponseLabor,
          mode,
        )}
      />
      <DurationRow
        label={t.averages.assignment}
        hint={hints.assignment}
        value={formatTechnicianTime(
          row.avgAssignment,
          row.avgAssignmentLabor,
          mode,
        )}
      />
      <DurationRow
        label={t.averages.validation}
        hint={hints.validation}
        value={formatTechnicianTime(
          row.avgValidation,
          row.avgValidationLabor,
          mode,
        )}
      />
    </dl>
  )
}

function LedTimes({ row, mode }: { row: TechnicianView; mode: TimeMode }) {
  return (
    <section className="flex flex-col gap-2 border-t pt-3">
      <h3 className="font-medium">{t.ledTimes}</h3>
      {row.ledTickets ? (
        <>
          <p className="text-sm text-muted-foreground">
            <HintLabel
              label={`${t.ledTickets} · ${row.ledTickets}`}
              hint={metricsMessages.teamHints.ledTickets}
            />
          </p>
          <LedDurations row={row} mode={mode} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noTimes}</p>
      )}
    </section>
  )
}

export function TechnicianDetail({
  row,
  mode,
}: {
  row: TechnicianView
  mode: TimeMode
}) {
  const title = useRef<HTMLHeadingElement>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="min-h-11 px-0 lg:min-h-8">
          {row.name}
          <ChevronRightIcon aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          title.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle ref={title} tabIndex={-1}>
            {row.name}
          </DialogTitle>
          <DialogDescription>
            {metricsMessages.timeMode.label} · {metricsMessages.timeMode[mode]}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-1">
          <DurationRow
            label={t.accumulatedTimes.pause}
            value={formatTechnicianTime(
              row.pauseMinutes,
              row.pauseLaborMinutes,
              mode,
            )}
          />
          <DurationRow
            label={t.accumulatedTimes.wait}
            value={formatTechnicianTime(
              row.waitMinutes,
              row.waitLaborMinutes,
              mode,
            )}
          />
        </dl>
        <LedTimes row={row} mode={mode} />
      </DialogContent>
    </Dialog>
  )
}
