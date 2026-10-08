import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { AdminTable } from '../api/admin-api'
import type { AdminField } from '../domain/catalogs'
import { initialValues, toAdminValues } from '../domain/form-values'
import type { RawValues } from '../domain/form-values'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { CatalogFieldInput } from './catalog-field-input'

interface CatalogFormProps {
  fields: AdminField[]
  row?: Record<string, unknown>
  optionsFor: (table: AdminTable) => AdminOption[]
  isSaving: boolean
  onSave: (values: Record<string, string | number | boolean | null>) => void
  onCancel: () => void
}

/** Formulario de alta/edición de un registro de catálogo. */
export function CatalogForm({
  fields,
  row,
  optionsFor,
  isSaving,
  onSave,
  onCancel,
}: CatalogFormProps) {
  const [raw, setRaw] = useState<RawValues>(() => initialValues(fields, row))
  const [errorField, setErrorField] = useState<string | null>(null)
  const { form, actions } = adminMessages

  function submit(event: FormEvent) {
    event.preventDefault()
    const { values, error } = toAdminValues(fields, raw)
    setErrorField(error)
    if (!error) onSave(values)
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <h3 className="text-sm font-medium">
        {row ? form.editTitle : form.newTitle}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <CatalogFieldInput
            key={field.name}
            field={field}
            value={raw[field.name] ?? ''}
            options={field.optionsTable ? optionsFor(field.optionsTable) : []}
            error={errorField === field.name ? form.required : undefined}
            onChange={(value) =>
              setRaw((current) => ({ ...current, [field.name]: value }))
            }
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving} className="min-h-11">
          {isSaving ? actions.saving : actions.save}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onCancel}
        >
          {actions.cancel}
        </Button>
      </div>
    </form>
  )
}
