import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SelectField } from '@/components/shared/form-fields'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { ActionKey } from '../domain/actions'
import { actionsRequiringSubject, pickPrimaryAction } from '../domain/actions'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { ticketMessages } from '../i18n'
import { AssignSupervisorForm } from './assign-supervisor-form'
import { DuplicateForm } from './duplicate-form'
import { RecaptureForm } from './recapture-form'
import { TicketActionForm } from './ticket-action-form'

const ONE_CLICK: ActionKey[] = ['start', 'resume', 'validate']
const FORM_ACTIONS: ActionKey[] = [
  'assign_technician',
  'add_auxiliary',
  'pause',
  'reject',
  'cancel',
  'change_priority',
  'attend',
  'comment',
  'open_claim',
  'resolve_claim',
  'reactivate',
]
const DEDICATED: ActionKey[] = [
  'recapture',
  'mark_duplicate',
  'assign_supervisor',
]

interface ActionControlsProps {
  visible: ActionKey[]
  oneClick: Partial<Record<ActionKey, () => void>>
  pending: Partial<Record<ActionKey, boolean>>
  blocked: ActionKey[]
  onOpenForm: (action: ActionKey) => void
}

function ActionControls({
  visible,
  oneClick,
  pending,
  blocked,
  onOpenForm,
}: ActionControlsProps) {
  const primary = pickPrimaryAction(visible)
  const secondary = visible.filter((action) => action !== primary)
  const run = (action: ActionKey) =>
    (oneClick[action] ?? (() => onOpenForm(action)))()
  const isDisabled = (action: ActionKey) =>
    Boolean(pending[action]) || blocked.includes(action)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary ? (
        <Button
          type="button"
          className="min-h-11"
          disabled={isDisabled(primary)}
          onClick={() => run(primary)}
        >
          {ticketMessages.actions[primary]}
        </Button>
      ) : null}
      {secondary.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11">
              {ticketMessages.actions.more}
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondary.map((action) => (
              <DropdownMenuItem
                key={action}
                disabled={isDisabled(action)}
                onClick={() => run(action)}
              >
                {ticketMessages.actions[action]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

function ProxySelector({
  participants,
  value,
  onChange,
}: {
  participants: TicketParticipant[]
  value: string
  onChange: (value: string) => void
}) {
  const seen = new Set<string>()
  const options = participants
    .filter((item) => {
      if (seen.has(item.technicianId)) return false
      seen.add(item.technicianId)
      return true
    })
    .map((item) => ({ value: item.technicianId, label: item.technicianName }))
  if (options.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <SelectField
        id="proxy-technician"
        label={ticketMessages.proxy.label}
        placeholder={ticketMessages.proxy.none}
        options={options}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {ticketMessages.proxy.help}
      </p>
    </div>
  )
}

function ProxyRequiredHint({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {ticketMessages.proxy.required}
    </p>
  )
}

interface ActionFormsProps {
  ticket: TicketDetail
  formAction: ActionKey | null
  subject: string | undefined
  onClose: () => void
}

function ActionForms({
  ticket,
  formAction,
  subject,
  onClose,
}: ActionFormsProps) {
  if (formAction === 'recapture') {
    return (
      <RecaptureForm
        ticket={ticket}
        subjectTechnicianId={subject}
        onClose={onClose}
      />
    )
  }
  if (formAction === 'mark_duplicate') {
    return <DuplicateForm ticketId={ticket.id} onClose={onClose} />
  }
  if (formAction === 'assign_supervisor') {
    return <AssignSupervisorForm ticketId={ticket.id} onClose={onClose} />
  }
  if (formAction && !DEDICATED.includes(formAction)) {
    return (
      <TicketActionForm
        ticketId={ticket.id}
        action={formAction}
        subjectTechnicianId={subject}
        onClose={onClose}
      />
    )
  }
  return null
}

function ActionSheet({
  ticket,
  formAction,
  subject,
  onClose,
}: ActionFormsProps) {
  return (
    <Sheet
      open={formAction !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {formAction ? ticketMessages.actions[formAction] : ''}
          </SheetTitle>
        </SheetHeader>
        <ActionForms
          ticket={ticket}
          formAction={formAction}
          subject={subject}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}

interface TicketActionsPanelProps {
  ticket: TicketDetail
  actions: ActionKey[]
  identity: Identity | null
  participants: TicketParticipant[]
}

/** Acciones disponibles: una primaria destacada y el resto en un menú. */
export function TicketActionsPanel({
  ticket,
  actions,
  identity,
  participants,
}: TicketActionsPanelProps) {
  const canProxy = can(identity, 'act_on_behalf')
  const [subjectTechnicianId, setSubject] = useState('')
  const [formAction, setFormAction] = useState<ActionKey | null>(null)
  const subject =
    canProxy && subjectTechnicianId ? subjectTechnicianId : undefined
  const mutations = useTicketActions(ticket.id, subject)

  const oneClick: Partial<Record<ActionKey, () => void>> = {
    start: () => mutations.start.mutate({}),
    resume: () => mutations.resume.mutate({}),
    validate: () => mutations.validate.mutate({}),
  }
  const pending: Partial<Record<ActionKey, boolean>> = {
    start: mutations.start.isPending,
    resume: mutations.resume.isPending,
    validate: mutations.validate.isPending,
  }

  const visible = actions.filter(
    (action) =>
      ONE_CLICK.includes(action) ||
      FORM_ACTIONS.includes(action) ||
      DEDICATED.includes(action),
  )
  if (visible.length === 0) return null
  const blocked = actionsRequiringSubject(identity, visible, Boolean(subject))
  const close = () => setFormAction(null)

  return (
    <div className="flex flex-col gap-4">
      {canProxy ? (
        <ProxySelector
          participants={participants}
          value={subjectTechnicianId}
          onChange={setSubject}
        />
      ) : null}
      <ActionControls
        visible={visible}
        oneClick={oneClick}
        pending={pending}
        blocked={blocked}
        onOpenForm={setFormAction}
      />
      <ProxyRequiredHint show={blocked.length > 0} />
      <ActionSheet
        ticket={ticket}
        formAction={formAction}
        subject={subject}
        onClose={close}
      />
    </div>
  )
}
