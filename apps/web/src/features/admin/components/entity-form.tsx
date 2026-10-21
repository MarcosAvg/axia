import type { FormEventHandler, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { adminMessages } from '../i18n'

interface EntityFormProps {
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
  isSaving: boolean
  submitLabel?: string
  cancelLabel?: string
  children: ReactNode
}

/** Cuerpo y pie uniforme de un formulario en diálogo: cuerpo con scroll y acciones fijas. */
export function EntityForm({
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
  cancelLabel,
  children,
}: EntityFormProps) {
  const { actions } = adminMessages
  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col gap-4"
      noValidate
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {children}
      </div>
      <footer className="flex items-center justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onCancel}
        >
          {cancelLabel ?? actions.cancel}
        </Button>
        <Button type="submit" className="min-h-11" disabled={isSaving}>
          {isSaving ? actions.saving : (submitLabel ?? actions.save)}
        </Button>
      </footer>
    </form>
  )
}
