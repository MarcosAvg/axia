import type { ReactNode } from 'react'
import type { SelectOption } from '@/components/shared/form-fields'
import { SelectField, TextAreaField } from '@/components/shared/form-fields'
import type { ReasonOption, TechnicianOption } from '@/features/catalogs'
import type { ActionKey } from '../domain/actions'
import { CLAIM_RESOLUTIONS } from '../domain/types'
import type { ClaimResolution } from '../domain/types'
import { ticketMessages } from '../i18n'

export interface ActionValues {
  technicianId: string
  reasonId: string
  priorityId: string
  note: string
  text: string
  resolution: ClaimResolution
}

export interface TicketActionFieldsProps {
  action: ActionKey
  technicians: TechnicianOption[]
  reasons: ReasonOption[]
  priorities: { id: string; name: string }[]
  values: ActionValues
  onChange: (patch: Partial<ActionValues>) => void
}

const fields = ticketMessages.actionFields
const REASON_ACTIONS: ActionKey[] = [
  'pause',
  'reject',
  'cancel',
  'open_claim',
  'resolve_claim',
  'reactivate',
]
const TEXT_ACTIONS: ActionKey[] = ['attend', 'comment', 'open_claim']
const PLACEHOLDER = 'Selecciona…'

const toOptions = (items: { id: string; label: string }[]): SelectOption[] =>
  items.map((item) => ({ value: item.id, label: item.label }))

const resolutionOptions: SelectOption[] = CLAIM_RESOLUTIONS.map((value) => ({
  value,
  label: ticketMessages.claimResolutions[value],
}))

function textLabel(action: ActionKey): string {
  if (action === 'attend') return fields.workDescription
  if (action === 'comment') return fields.comment
  return fields.claimDescription
}

function SelectBlock({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SelectField
      id={id}
      label={label}
      placeholder={PLACEHOLDER}
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function TextBlock({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <TextAreaField
      id={id}
      label={label}
      rows={3}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function selectField(props: TicketActionFieldsProps): ReactNode {
  const { action, values, onChange, technicians, reasons, priorities } = props
  if (action === 'assign_technician') {
    return (
      <SelectBlock
        id="action-technician"
        label={fields.technician}
        options={toOptions(
          technicians.map((t) => ({ id: t.id, label: t.fullName })),
        )}
        value={values.technicianId}
        onChange={(technicianId) => onChange({ technicianId })}
      />
    )
  }
  if (REASON_ACTIONS.includes(action)) {
    return (
      <SelectBlock
        id="action-reason"
        label={fields.reason}
        options={toOptions(reasons.map((r) => ({ id: r.id, label: r.name })))}
        value={values.reasonId}
        onChange={(reasonId) => onChange({ reasonId })}
      />
    )
  }
  if (action === 'resolve_claim') {
    return (
      <SelectBlock
        id="action-resolution"
        label={fields.resolution}
        options={resolutionOptions}
        value={values.resolution}
        onChange={(raw) => {
          const next = CLAIM_RESOLUTIONS.find((candidate) => candidate === raw)
          if (next) onChange({ resolution: next })
        }}
      />
    )
  }
  if (action === 'change_priority') {
    return (
      <SelectBlock
        id="action-priority"
        label={fields.priority}
        options={toOptions(
          priorities.map((p) => ({ id: p.id, label: p.name })),
        )}
        value={values.priorityId}
        onChange={(priorityId) => onChange({ priorityId })}
      />
    )
  }
  return null
}

function textFields(props: TicketActionFieldsProps): ReactNode[] {
  const { action, values, onChange } = props
  const blocks: ReactNode[] = []
  if (TEXT_ACTIONS.includes(action)) {
    blocks.push(
      <TextBlock
        key="text"
        id="action-text"
        label={textLabel(action)}
        value={values.text}
        onChange={(text) => onChange({ text })}
      />,
    )
  }
  if (REASON_ACTIONS.includes(action)) {
    blocks.push(
      <TextBlock
        key="note"
        id="action-note"
        label={fields.note}
        value={values.note}
        onChange={(note) => onChange({ note })}
      />,
    )
  }
  return blocks
}

/** Campos que pide cada acción. */
export function TicketActionFields(props: TicketActionFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      {selectField(props)}
      {textFields(props)}
    </div>
  )
}
