import { ErrorAlert } from '@/components/shared/async-state'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { EvidenceType } from '../domain/types'
import { ticketMessages } from '../i18n'
import { useUploadEvidence } from '../hooks/use-evidence'
import { EvidenceFields } from './evidence-fields'

/** Sube una evidencia (foto o archivo) al tiquet. */
export function EvidenceUploader({
  ticketId,
  cycle,
}: {
  ticketId: string
  cycle: number
}) {
  const mutation = useUploadEvidence()
  const [type, setType] = useState<EvidenceType>('request')
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)

  function submit() {
    if (!file) return
    mutation.mutate(
      { ticketId, cycle, type, file },
      {
        onSuccess: () => {
          setFile(null)
          setInputKey((key) => key + 1)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <EvidenceFields
        type={type}
        inputKey={inputKey}
        onTypeChange={setType}
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
