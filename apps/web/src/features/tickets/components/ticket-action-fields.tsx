import type { ReactNode } from 'react'
import type { SelectOption } from '@/components/shared/form-fields'
import { SelectField, TextAreaField } from '@/components/shared/form-fields'
import { indentReasons, rootReasons } from '@/features/catalogs'
import type { ReasonOption, TechnicianOption } from '@/features/catalogs'
import type { ActionKey } from '../domain/actions'
import { CLAIM_RESOLUTIONS } from '../domain/types'
import type { ClaimResolution } from '../domain/types'
import { ticketMessages } from '../i18n'
import { pauseMessages } from '../pause-i18n'
import { ReasonCascade } from './reason-cascade'

export interface ActionValues {
  technicianId: string
  reasonId: string
  priorityId: string
  serviceTypeId: string
  note: string
  text: string
  resolution: ClaimResolution
}

export interface TicketActionFieldsProps {
  action: ActionKey
  technicians: TechnicianOption[]
  reasons: ReasonOption[]
  priorities: { id: string; name: string }[]
  serviceTypes: { id: string; name: string }[]
  motiveReasonId?: string | null
  values: ActionValues
  onChange: (patch: Partial<ActionValues>) => void
}

const fields = ticketMessages.actionFields
const REASON_ACTIONS: ActionKey[] = [
  'pause',
  'advance_pause',
  'resume',
  'reject',
  'cancel',
  'open_claim',
  'resolve_claim',
  'reactivate',
  'add_auxiliary',
]
const TEXT_ACTIONS: ActionKey[] = [
  'attend',
  'record_progress',
  'comment',
  'open_claim',
]
const PLACEHOLDER = 'Selecciona…'

const toOptions = (items: { id: string; label: string }[]): SelectOption[] =>
  items.map((item) => ({ value: item.id, label: item.label }))

const resolutionOptions: SelectOption[] = CLAIM_RESOLUTIONS.map((value) => ({
  value,
  label: ticketMessages.claimResolutions[value],
}))

function textLabel(action: ActionKey): string {
  if (action === 'attend') return fields.workDescription
  if (action === 'record_progress') return fields.progress
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

function resolutionSelect(
  value: string,
  onChange: (patch: Partial<ActionValues>) => void,
): ReactNode {
  return (
    <SelectBlock
      key="resolution"
      id="action-resolution"
      label={fields.resolution}
      options={resolutionOptions}
      value={value}
      onChange={(raw) => {
        const next = CLAIM_RESOLUTIONS.find((candidate) => candidate === raw)
        if (next) onChange({ resolution: next })
      }}
    />
  )
}

const reasonNameOptions = (items: ReasonOption[]): SelectOption[] =>
  toOptions(items.map((reason) => ({ id: reason.id, label: reason.name })))

function reasonOptionsFor(
  action: ActionKey,
  reasons: ReasonOption[],
): SelectOption[] {
  if (action === 'pause') return reasonNameOptions(rootReasons(reasons))
  return toOptions(
    indentReasons(reasons).map((reason) => ({
      id: reason.id,
      label: reason.label,
    })),
  )
}

function reasonBlock(props: TicketActionFieldsProps): ReactNode | null {
  const { action, values, onChange, reasons } = props
  if (action === 'resume' || action === 'advance_pause') {
    return (
      <ReasonCascade
        key="reason-cascade"
        label={pauseMessages.substate}
        reasons={reasons}
        rootId={props.motiveReasonId ?? null}
        value={values.reasonId}
        onChange={(reasonId) => onChange({ reasonId })}
      />
    )
  }
  if (!REASON_ACTIONS.includes(action)) return null
  return (
    <SelectBlock
      key="reason"
      id="action-reason"
      label={fields.reason}
      options={reasonOptionsFor(action, reasons)}
      value={values.reasonId}
      onChange={(reasonId) => onChange({ reasonId })}
    />
  )
}

function actionSelects(props: TicketActionFieldsProps): ReactNode[] {
  const { action, values, onChange, technicians, priorities } = props
  const blocks: ReactNode[] = []
  const technicianOptions = toOptions(
    technicians.map((t) => ({ id: t.id, label: t.fullName })),
  )
  const priorityOptions = toOptions(
    priorities.map((p) => ({ id: p.id, label: p.name })),
  )

  if (action === 'assign_technician' || action === 'add_auxiliary') {
    blocks.push(
      <SelectBlock
        key="technician"
        id="action-technician"
        label={fields.technician}
        options={technicianOptions}
        value={values.technicianId}
        onChange={(technicianId) => onChange({ technicianId })}
      />,
    )
  }
  const reason = reasonBlock(props)
  if (reason) blocks.push(reason)
  if (action === 'resolve_claim') {
    blocks.push(resolutionSelect(values.resolution, onChange))
  }
  if (action === 'change_priority') {
    blocks.push(
      <SelectBlock
        key="priority"
        id="action-priority"
        label={fields.priority}
        options={priorityOptions}
        value={values.priorityId}
        onChange={(priorityId) => onChange({ priorityId })}
      />,
    )
  }
  return blocks
}

function selectFields(props: TicketActionFieldsProps): ReactNode[] {
  const blocks = actionSelects(props)
  if (props.action === 'attend') {
    const serviceOptions = toOptions(
      props.serviceTypes.map((service) => ({
        id: service.id,
        label: service.name,
      })),
    )
    blocks.unshift(
      <SelectBlock
        key="service"
        id="action-service-type"
        label={fields.serviceType}
        options={serviceOptions}
        value={props.values.serviceTypeId}
        onChange={(serviceTypeId) => props.onChange({ serviceTypeId })}
      />,
    )
  }
  return blocks
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
      {selectFields(props)}
      {textFields(props)}
    </div>
  )
}
