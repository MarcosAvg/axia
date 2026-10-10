import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/use-media-query'
import type { ActionKey } from '../domain/actions'
import type { TicketDetail } from '../domain/types'
import { ticketMessages } from '../i18n'
import { AssignSupervisorForm } from './assign-supervisor-form'
import { DuplicateForm } from './duplicate-form'
import { RecaptureForm } from './recapture-form'
import { TicketActionForm } from './ticket-action-form'
import { DEDICATED } from './ticket-action-handlers'

interface ActionFormsProps {
  ticket: TicketDetail
  formAction: ActionKey | null
  subject: string | undefined
  excludeIds?: string[]
  onClose: () => void
}

function ActionForms({
  ticket,
  formAction,
  subject,
  excludeIds,
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
        cycle={ticket.cycle}
        action={formAction}
        subjectTechnicianId={subject}
        excludeIds={excludeIds}
        onClose={onClose}
      />
    )
  }
  return null
}

/** Contenedor de las acciones: modal centrado en escritorio y hoja inferior en móvil. */
export function ActionContainer({
  ticket,
  formAction,
  subject,
  excludeIds,
  onClose,
}: ActionFormsProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const title = formAction ? ticketMessages.actions[formAction] : ''
  const body = (
    <ActionForms
      key={formAction ?? 'none'}
      ticket={ticket}
      formAction={formAction}
      subject={subject}
      excludeIds={excludeIds}
      onClose={onClose}
    />
  )
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose()
  }

  if (isDesktop) {
    return (
      <Dialog open={formAction !== null} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={formAction !== null} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-xl p-4 pb-6"
      >
        <SheetHeader className="p-0 pr-8">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
