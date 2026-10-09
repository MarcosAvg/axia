import { ErrorAlert } from '@/components/shared/async-state'
import type { TicketError } from '../domain/errors'
import type { DuplicateCandidate } from '../domain/types'
import { DuplicateAlert } from './duplicate-alert'

interface TicketFormAsideProps {
  submitError: string | null
  createError: TicketError | null
  candidates: DuplicateCandidate[]
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Columna lateral del alta: errores y aviso de duplicados. */
export function TicketFormAside({
  submitError,
  createError,
  candidates,
  isSubmitting,
  onConfirm,
  onCancel,
}: TicketFormAsideProps) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
      {submitError ? <ErrorAlert message={submitError} /> : null}
      {createError ? <ErrorAlert message={createError.message} /> : null}
      {candidates.length > 0 ? (
        <DuplicateAlert
          candidates={candidates}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </aside>
  )
}
