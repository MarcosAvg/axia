import type { SelectOption } from '@/components/shared/form-fields'
import { SelectField, TextAreaField } from '@/components/shared/form-fields'
import type { ReasonOption, TechnicianOption } from '@/features/catalogs'
import type { ActionKey } from '../domain/actions'
import { ticketMessages } from '../i18n'

export interface ActionValues {
  technicianId: string
  reasonId: string
  priorityId: string
  note: string
  text: string
}

const REASON_ACTIONS: ActionKey[] = ['pause', 'reject', 'cancel']
const PLACEHOLDER = 'Selecciona…'

const toOptions = (items: { id: string; label: string }[]): SelectOption[] =>
  items.map((item) => ({ value: item.id, label: item.label }))

function TechnicianField({
  technicians,
  value,
  onChange,
}: {
  technicians: TechnicianOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SelectField
      id="action-technician"
      label={ticketMessages.actionFields.technician}
      placeholder={PLACEHOLDER}
      options={toOptions(
        technicians.map((t) => ({ id: t.id, label: t.fullName })),
      )}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function ReasonField({
  reasons,
  value,
  onChange,
}: {
  reasons: ReasonOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SelectField
      id="action-reason"
      label={ticketMessages.actionFields.reason}
      placeholder={PLACEHOLDER}
      options={toOptions(reasons.map((r) => ({ id: r.id, label: r.name })))}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function PriorityField({
  priorities,
  value,
  onChange,
}: {
  priorities: { id: string; name: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SelectField
      id="action-priority"
      label={ticketMessages.actionFields.priority}
      placeholder={PLACEHOLDER}
      options={toOptions(priorities.map((p) => ({ id: p.id, label: p.name })))}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

interface TicketActionFieldsProps {
  action: ActionKey
  technicians: TechnicianOption[]
  reasons: ReasonOption[]
  priorities: { id: string; name: string }[]
  values: ActionValues
  onChange: (patch: Partial<ActionValues>) => void
}

/** Campos que pide cada acción. */
export function TicketActionFields({
  action,
  technicians,
  reasons,
  priorities,
  values,
  onChange,
}: TicketActionFieldsProps) {
  const usesReason = REASON_ACTIONS.includes(action)

  return (
    <div className="flex flex-col gap-4">
      {action === 'assign_technician' ? (
        <TechnicianField
          technicians={technicians}
          value={values.technicianId}
          onChange={(technicianId) => onChange({ technicianId })}
        />
      ) : null}
      {usesReason ? (
        <ReasonField
          reasons={reasons}
          value={values.reasonId}
          onChange={(reasonId) => onChange({ reasonId })}
        />
      ) : null}
      {action === 'change_priority' ? (
        <PriorityField
          priorities={priorities}
          value={values.priorityId}
          onChange={(priorityId) => onChange({ priorityId })}
        />
      ) : null}
      {action === 'attend' || action === 'comment' ? (
        <TextAreaField
          id={action === 'attend' ? 'action-work' : 'action-comment'}
          label={
            action === 'attend'
              ? ticketMessages.actionFields.workDescription
              : ticketMessages.actionFields.comment
          }
          rows={3}
          value={values.text}
          onChange={(event) => onChange({ text: event.target.value })}
        />
      ) : null}
      {usesReason ? (
        <TextAreaField
          id="action-note"
          label={ticketMessages.actionFields.note}
          rows={2}
          value={values.note}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      ) : null}
    </div>
  )
}
