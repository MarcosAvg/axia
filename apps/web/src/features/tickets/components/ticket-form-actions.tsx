import { Button } from '@/components/ui/button'
import type { TicketError } from '../domain/errors'
import type { DuplicateCandidate } from '../domain/types'
import { ticketMessages } from '../i18n'
import { DuplicateAlert } from './duplicate-alert'

interface TicketFormActionsProps {
  candidates: DuplicateCandidate[]
  submitError: string | null
  createError: TicketError | null
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Errores, aviso de duplicados y botón de registro. */
export function TicketFormActions({
  candidates,
  submitError,
  createError,
  isSubmitting,
  onConfirm,
  onCancel,
}: TicketFormActionsProps) {
  return (
    <>
      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
      {createError ? (
        <p role="alert" className="text-sm text-destructive">
          {createError.message}
        </p>
      ) : null}
      {candidates.length > 0 ? (
        <DuplicateAlert
          candidates={candidates}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full sm:w-auto"
      >
        {isSubmitting
          ? ticketMessages.create.submitting
          : ticketMessages.create.submit}
      </Button>
    </>
  )
}
