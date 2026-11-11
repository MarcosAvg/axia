import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type {
  RequesterTimeRow,
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { RequesterTimes } from './requester-times'
import { TechnicianTimes } from './technician-times'

const t = metricsMessages.times

type PeopleView = 'technicians' | 'requesters'

const VIEWS = [
  ['technicians', t.technicians],
  ['requesters', t.requestersTab],
] as const

function ViewSwitch({
  view,
  onChange,
}: {
  view: PeopleView
  onChange: (view: PeopleView) => void
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

/** Personas: técnicos y solicitantes en una sola sección. */
export function PeopleTimes({
  technicians,
  technicianTimes,
  technicianSubjectTimes,
  requesterTimes,
  mode,
}: {
  technicians: TechnicianRow[]
  technicianTimes: TechnicianTimeRow[]
  technicianSubjectTimes: TechnicianSubjectTimeRow[]
  requesterTimes: RequesterTimeRow[]
  mode: TimeMode
}) {
  const [view, setView] = useState<PeopleView>('technicians')
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium">{t.people}</h2>
        <ViewSwitch view={view} onChange={setView} />
      </div>
      {view === 'technicians' ? (
        <TechnicianTimes
          technicians={technicians}
          times={technicianTimes}
          subjectTimes={technicianSubjectTimes}
          mode={mode}
        />
      ) : (
        <RequesterTimes rows={requesterTimes} mode={mode} />
      )}
    </section>
  )
}
