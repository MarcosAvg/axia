import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ActionValues } from '../domain/action-values'
import type { ActionField } from '../domain/action-validation'
import { missingActionFields } from '../domain/action-validation'
import type { ActionKey } from '../domain/actions'
import { evidenceForAction } from '../domain/evidence'
import { toTicketError } from '../domain/errors'
import type { EvidenceType } from '../domain/types'
import { ticketMessages } from '../i18n'
import { useUploadEvidence } from '../hooks/use-evidence'
import type { Mutations } from './ticket-action-handlers'
import { buildSubmitHandlers } from './ticket-action-handlers'

interface SubmitContext {
  event: FormEvent
  action: ActionKey
  values: ActionValues
  file: File | null
  actions: Mutations
  ticketId: string
  cycle: number
  onClose: () => void
  upload: ReturnType<typeof useUploadEvidence>
  setFilePending: (pending: boolean) => void
  setEvidenceError: (message: string | null) => void
  setValidationErrors: (errors: Partial<Record<ActionField, string>>) => void
}

function errorsForMissing(
  missing: ActionField[],
): Partial<Record<ActionField, string>> {
  return Object.fromEntries(
    missing
      .filter((field) => field !== 'evidence')
      .map((field) => [field, ticketMessages.actionFields.requiredField]),
  ) as Partial<Record<ActionField, string>>
}

async function uploadEvidenceForAction({
  action,
  values,
  file,
  ticketId,
  cycle,
  upload,
  setFilePending,
  setEvidenceError,
}: SubmitContext): Promise<boolean> {
  const evidenceType = evidenceForAction(action)
  if (!evidenceType) return true
  if (!file) return false

  setFilePending(true)
  try {
    await upload.mutateAsync({
      ticketId,
      cycle,
      type: evidenceType,
      file,
      note: action === 'record_progress' ? values.text.trim() || null : null,
    })
    return true
  } catch (error) {
    setEvidenceError(toTicketError(error).message)
    return false
  } finally {
    setFilePending(false)
  }
}

async function submitAction(context: SubmitContext) {
  context.event.preventDefault()
  const missing = missingActionFields(
    context.action,
    context.values,
    Boolean(context.file),
  )
  context.setValidationErrors(errorsForMissing(missing))
  context.setEvidenceError(
    missing.includes('evidence')
      ? ticketMessages.actionFields.evidenceRequired
      : null,
  )
  if (missing.length > 0) return

  const handler = buildSubmitHandlers(context.actions, context.values, {
    onSuccess: context.onClose,
  })[context.action]
  const isProgress = context.action === 'record_progress'
  if (!handler && !isProgress) return
  if (!(await uploadEvidenceForAction(context))) return
  if (isProgress) context.onClose()
  else handler?.()
}

/** Estado y envío de una acción: valida, sube la evidencia y luego ejecuta. */
export function useActionSubmission({
  actions,
  values,
  action,
  ticketId,
  cycle,
  onClose,
}: {
  actions: Mutations
  values: ActionValues
  action: ActionKey
  ticketId: string
  cycle: number
  onClose: () => void
}) {
  const upload = useUploadEvidence()
  const [file, setFileState] = useState<File | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<ActionField, string>>
  >({})
  const [uploading, setUploading] = useState(false)
  const evidenceType: EvidenceType | undefined = evidenceForAction(action)

  function clearValidation() {
    setValidationErrors({})
    setEvidenceError(null)
  }

  function setFile(next: File | null) {
    clearValidation()
    setFileState(next)
  }

  const submit = (event: FormEvent) =>
    submitAction({
      event,
      action,
      values,
      file,
      actions,
      ticketId,
      cycle,
      onClose,
      upload,
      setFilePending: setUploading,
      setEvidenceError,
      setValidationErrors,
    })

  return {
    evidenceType,
    evidenceError,
    validationErrors,
    file,
    uploading,
    setFile,
    clearValidation,
    submit,
  }
}
