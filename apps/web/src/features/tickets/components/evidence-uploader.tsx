import { ErrorAlert } from '@/components/shared/async-state'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { allowedEvidenceTypes } from '../domain/evidence'
import type { EvidenceType, TicketStatus } from '../domain/types'
import { ticketMessages } from '../i18n'
import { useUploadEvidence } from '../hooks/use-evidence'
import { EvidenceFields } from './evidence-fields'

/** Sube evidencia suelta, solo con los tipos permitidos para el estado actual. */
export function EvidenceUploader({
  ticketId,
  cycle,
  status,
}: {
  ticketId: string
  cycle: number
  status: TicketStatus
}) {
  const mutation = useUploadEvidence()
  const [chosen, setChosen] = useState<EvidenceType | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const allowed = allowedEvidenceTypes(status)
  const type: EvidenceType =
    chosen && allowed.includes(chosen) ? chosen : (allowed[0] ?? 'other')

  if (allowed.length === 0) return null

  function submit() {
    if (!file) return
    mutation.mutate(
      { ticketId, cycle, type, file },
      {
        onSuccess: () => {
          setFile(null)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <EvidenceFields
        type={type}
        types={allowed}
        file={file}
        onTypeChange={setChosen}
        onFileChange={setFile}
      />
      {mutation.error ? (
        <ErrorAlert message={ticketMessages.errors.unknown} />
      ) : null}
      <Button
        type="button"
        onClick={submit}
        disabled={!file || mutation.isPending}
        className="min-h-11 w-full sm:w-auto"
      >
        {mutation.isPending
          ? ticketMessages.evidence.uploading
          : ticketMessages.evidence.submit}
      </Button>
    </div>
  )
}
