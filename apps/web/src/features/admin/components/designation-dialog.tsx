import { useState } from 'react'
import type { FormEvent } from 'react'
import { SelectField } from '@/components/shared/form-fields'
import type { AdminRow } from '../api/admin-api'
import type { LinkablePerson } from '../domain/access'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

interface DesignationFieldsProps {
  technicians: LinkablePerson[]
  categories: AdminRow[]
  technicianId: string
  categoryId: string
  onChange: (patch: { technicianId?: string; categoryId?: string }) => void
}

function DesignationFields({
  technicians,
  categories,
  technicianId,
  categoryId,
  onChange,
}: DesignationFieldsProps) {
  const { scopes: t, actions } = adminMessages
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id="designation-technician"
        label={t.technicianName}
        placeholder={actions.selectPlaceholder}
        options={technicians.map((person) => ({
          value: person.id,
          label: person.fullName,
        }))}
        value={technicianId}
        onChange={(event) => onChange({ technicianId: event.target.value })}
      />
      <SelectField
        id="designation-category"
        label={t.category}
        placeholder={actions.selectPlaceholder}
        options={categories.map((category) => ({
          value: String(category.id),
          label: String(category.name),
        }))}
        value={categoryId}
        onChange={(event) => onChange({ categoryId: event.target.value })}
      />
    </div>
  )
}

interface DesignationDialogProps {
  technicians: LinkablePerson[]
  categories: AdminRow[]
  isSaving: boolean
  onCreate: (technicianId: string, categoryId: string) => void
  onClose: () => void
}

/** Alta de una designación de técnico a categoría. */
export function DesignationDialog({
  technicians,
  categories,
  isSaving,
  onCreate,
  onClose,
}: DesignationDialogProps) {
  const [values, setValues] = useState({ technicianId: '', categoryId: '' })
  const { scopes: t, actions } = adminMessages

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.technicianId || !values.categoryId) return
    onCreate(values.technicianId, values.categoryId)
    onClose()
  }

  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t.addDesignation}
      description={t.addDesignationHelp}
    >
      <EntityForm
        onSubmit={submit}
        onCancel={onClose}
        isSaving={isSaving}
        submitLabel={actions.add}
      >
        <FormGroup title={t.technician}>
          <DesignationFields
            technicians={technicians}
            categories={categories}
            technicianId={values.technicianId}
            categoryId={values.categoryId}
            onChange={(patch) =>
              setValues((current) => ({ ...current, ...patch }))
            }
          />
        </FormGroup>
      </EntityForm>
    </EntityDialog>
  )
}
