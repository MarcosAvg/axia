import { SelectField } from '@/components/shared/form-fields'
import { EVIDENCE_TYPES } from '../domain/types'
import type { EvidenceType } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'

const TYPE_OPTIONS = EVIDENCE_TYPES.map((type) => ({
  value: type,
  label: evidenceTypeLabels[type],
}))

interface EvidenceFieldsProps {
  type: EvidenceType
  inputKey: number
  onTypeChange: (type: EvidenceType) => void
  onFileChange: (file: File | null) => void
}

/** Campos para elegir el tipo de evidencia y el archivo. */
export function EvidenceFields({
  type,
  inputKey,
  onTypeChange,
  onFileChange,
}: EvidenceFieldsProps) {
  return (
    <>
      <SelectField
        id="evidence-type"
        label={ticketMessages.evidence.type}
        options={TYPE_OPTIONS}
        value={type}
        onChange={(event) => {
          const next = EVIDENCE_TYPES.find(
            (candidate) => candidate === event.target.value,
          )
          if (next) onTypeChange(next)
        }}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="evidence-file" className="text-sm font-medium">
          {ticketMessages.evidence.file}
        </label>
        <input
          key={inputKey}
          id="evidence-file"
          type="file"
          accept="image/*,application/pdf"
          className="min-h-11 text-sm"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </div>
    </>
  )
}
