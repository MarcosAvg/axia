import { ErrorAlert } from '@/components/shared/async-state'
import { Button } from '@/components/ui/button'
import { toTicketError } from '../domain/errors'
import type { TicketDetail } from '../domain/types'
import { useRecaptureForm } from '../hooks/use-recapture-form'
import { ticketMessages } from '../i18n'
import { RecaptureFields } from './recapture-fields'

/** Recaptura: aplica una captura corregida sobre el mismo tiquet. */
export function RecaptureForm({
  ticket,
  subjectTechnicianId,
  onClose,
}: {
  ticket: TicketDetail
  subjectTechnicianId?: string
  onClose: () => void
}) {
  const form = useRecaptureForm(ticket, subjectTechnicianId, onClose)

  return (
    <form onSubmit={form.submit} className="flex flex-col gap-4">
      <RecaptureFields
        values={form.values}
        onChange={form.change}
        {...form.catalogs}
      />
      {form.hasError ? (
        <ErrorAlert message={ticketMessages.actionFields.required} />
      ) : null}
      {form.mutationError ? (
        <ErrorAlert message={toTicketError(form.mutationError).message} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={form.isPending} className="min-h-11">
          {ticketMessages.actionFields.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onClose}
        >
          {ticketMessages.actionFields.cancel}
        </Button>
      </div>
    </form>
  )
}
