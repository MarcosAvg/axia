import { FileField } from '@/components/shared/file-field'
import { SelectField } from '@/components/shared/form-fields'
import type { EvidenceType } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'

interface EvidenceFieldsProps {
  type: EvidenceType
  types: EvidenceType[]
  file: File | null
  onTypeChange: (type: EvidenceType) => void
  onFileChange: (file: File | null) => void
}

/** Campos para elegir el tipo de evidencia (solo los válidos) y el archivo. */
export function EvidenceFields({
  type,
  types,
  file,
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
      <FileField
        id="evidence-file"
        label={ticketMessages.evidence.file}
        file={file}
        onChange={onFileChange}
        accept="image/*,application/pdf"
        camera
      />
    </>
  )
}
