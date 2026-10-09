import { SelectField } from '@/components/shared/form-fields'
import type { EvidenceType } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'

interface EvidenceFieldsProps {
  type: EvidenceType
  types: EvidenceType[]
  inputKey: number
  onTypeChange: (type: EvidenceType) => void
  onFileChange: (file: File | null) => void
}

/** Campos para elegir el tipo de evidencia (solo los válidos) y el archivo. */
export function EvidenceFields({
  type,
  types,
  inputKey,
  onTypeChange,
  onFileChange,
}: EvidenceFieldsProps) {
  const options = types.map((item) => ({
    value: item,
    label: evidenceTypeLabels[item],
  }))

  return (
    <>
      <SelectField
        id="evidence-type"
        label={ticketMessages.evidence.type}
        options={options}
        value={type}
        onChange={(event) => {
          const next = types.find((item) => item === event.target.value)
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
