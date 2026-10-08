import { formatDateTime } from '@/lib/format'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { ticketMessages } from '../i18n'
import { StatusBadge } from './status-badge'

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? '—'}</dd>
    </div>
  )
}

/** Encabezado y captura del tiquet. */
export function TicketSummary({ ticket }: { ticket: TicketDetail }) {
  const { fields } = ticketMessages.detail

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-semibold">{ticket.folio}</span>
        <StatusBadge status={ticket.status} />
      </div>
      <p className="text-sm">{ticket.description}</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Field label={fields.building} value={ticket.buildingName} />
        <Field label={fields.location} value={ticket.locationName} />
        <Field label={fields.dependency} value={ticket.dependencyName} />
        <Field label={fields.category} value={ticket.categoryName} />
        <Field label={fields.subcategory} value={ticket.subcategoryName} />
        <Field label={fields.problem} value={ticket.problemName} />
        <Field label={fields.serviceType} value={ticket.serviceTypeName} />
        <Field label={fields.priority} value={ticket.priorityName} />
        <Field label={fields.channel} value={ticket.channelName} />
        <Field label={fields.team} value={ticket.teamName} />
        <Field label={fields.requester} value={ticket.requesterName} />
        <Field
          label={fields.requesterContact}
          value={ticket.requesterContact}
        />
        <Field
          label={fields.reportedAt}
          value={formatDateTime(ticket.reportedAt)}
        />
        <Field
          label={fields.closedAt}
          value={ticket.closedAt ? formatDateTime(ticket.closedAt) : null}
        />
      </dl>
    </div>
  )
}

/** Lista de participantes del tiquet. */
export function ParticipantList({
  participants,
}: {
  participants: TicketParticipant[]
}) {
  if (participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {ticketMessages.detail.noParticipants}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {participants.map((participant, index) => (
        <li key={`${participant.technicianName}-${index}`}>
          {participant.technicianName}
          {' · '}
          {participant.participationType === 'leader' ? 'Líder' : 'Auxiliar'}
        </li>
      ))}
    </ul>
  )
}
