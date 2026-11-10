import { Button } from '@/components/ui/button'
import { ButtonGrid } from '@/components/shared/button-grid'
import { ErrorAlert } from '@/components/shared/async-state'
import { toTicketError } from '../domain/errors'
import { ticketMessages } from '../i18n'

export function ActionFormFooter({
  error,
  isPending,
  onClose,
}: {
  error: unknown
  isPending: boolean
  onClose: () => void
}) {
  return (
    <>
      {error ? <ErrorAlert message={toTicketError(error).message} /> : null}
      <ButtonGrid>
        <Button type="submit" disabled={isPending} className="min-h-11">
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
      </ButtonGrid>
    </>
  )
}
