import { useState } from 'react'
import type { FormEvent } from 'react'
import { saveAndUploadEvidence } from '../api/offline-evidence'
import type { ActionKey } from '../domain/actions'
import { evidenceForAction } from '../domain/evidence'
import { toTicketError } from '../domain/errors'
import type { EvidenceType } from '../domain/types'
import { ticketMessages } from '../i18n'
import type { ActionValues } from './ticket-action-fields'
import { buildSubmitHandlers } from './ticket-action-handlers'
import type { Mutations } from './ticket-action-handlers'

interface UseActionSubmission {
  actions: Mutations
  values: ActionValues
  action: ActionKey
  ticketId: string
  cycle: number
  onClose: () => void
}

/** Estado y envío de una acción: sube la evidencia que la acción exige y luego la ejecuta. */
export function useActionSubmission({
  actions,
  values,
  action,
  ticketId,
  cycle,
  onClose,
}: UseActionSubmission): {
  evidenceType: EvidenceType | undefined
  evidenceError: string | null
  uploading: boolean
  setFile: (file: File | null) => void
  submit: (event: FormEvent) => Promise<void>
} {
  const [file, setFile] = useState<File | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const evidenceType = evidenceForAction(action)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const handler = buildSubmitHandlers(actions, values, {
      onSuccess: onClose,
    })[action]
    if (!handler) return

    if (evidenceType) {
      if (!file) {
        setEvidenceError(ticketMessages.actionFields.evidenceRequired)
        return
      }
      setEvidenceError(null)
      setUploading(true)
      try {
        await saveAndUploadEvidence({
          ticketId,
          cycle,
          type: evidenceType,
          file,
        })
      } catch (error) {
        setEvidenceError(toTicketError(error).message)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    handler()
  }

  return { evidenceType, evidenceError, uploading, setFile, submit }
}
