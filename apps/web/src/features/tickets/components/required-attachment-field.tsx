import { FileField } from '@/components/shared/file-field'
import { acceptFor, attachmentTypeLabel } from '../domain/attachments'
import { ticketMessages } from '../i18n'

interface RequiredAttachmentFieldProps {
  types: string[]
  file: File | null
  error?: string
  hint?: string | null
  onChange: (file: File | null) => void
}

/** Campo condicional para el adjunto que exige el problema seleccionado. */
export function RequiredAttachmentField({
  types,
  file,
  error,
  hint,
  onChange,
}: RequiredAttachmentFieldProps) {
  if (types.length === 0) return null
  const formats = types.map(attachmentTypeLabel).join(', ')
  return (
    <div className="flex flex-col gap-1">
      <FileField
        id="required-attachment"
        label={ticketMessages.create.attachment}
        file={file}
        onChange={onChange}
        accept={acceptFor(types)}
        hint={hint ?? ticketMessages.create.attachmentHint}
      />
      <p className="text-xs text-muted-foreground">Formatos: {formats}.</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
