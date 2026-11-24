import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { SelectField } from '@/components/shared/form-fields'
import type { AdminRow } from '../api/admin-api'
import type { LinkablePerson } from '../domain/access'
import type { TechnicianDesignation } from '../domain/scope-list'
import { adminMessages } from '../i18n'
import { AssignmentDialog } from './assignment-dialog'
import { AssignmentOptions } from './assignment-options'

const { scopes: t, actions } = adminMessages
const schema = z.object({
  technicianId: z.uuid(t.selectTechnician),
  categoryIds: z.array(z.uuid()),
})

interface DesignationDialogProps {
  technicians: LinkablePerson[]
  categories: AdminRow[]
  designations: TechnicianDesignation[]
  editing?: TechnicianDesignation
  description: string
  isSaving: boolean
  onSave: (values: z.infer<typeof schema>) => void
  onClose: () => void
}

export function DesignationDialog({
  technicians,
  categories,
  designations,
  editing,
  description,
  isSaving,
  onSave,
  onClose,
}: DesignationDialogProps) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      technicianId: editing?.technicianId ?? '',
      categoryIds: editing?.categoryIds ?? [],
    },
  })
  const technicianId = useWatch({ control: form.control, name: 'technicianId' })
  const categoryIds = useWatch({ control: form.control, name: 'categoryIds' })
  const error = form.formState.errors.technicianId?.message

  function selectTechnician(id: string) {
    const existing = designations.find((item) => item.technicianId === id)
    form.setValue('technicianId', id, { shouldValidate: Boolean(error) })
    form.setValue('categoryIds', existing?.categoryIds ?? [])
  }

  return (
    <AssignmentDialog
      title={editing ? t.editCategories : t.addDesignation}
      description={description}
      isSaving={isSaving}
      onSave={form.handleSubmit(onSave)}
      onClose={onClose}
    >
      {editing ? null : (
        <SelectField
          id="designation-technician"
          label={t.technicianName}
          placeholder={actions.selectPlaceholder}
          options={technicians.map((person) => ({
            value: person.id,
            label: person.fullName,
          }))}
          value={technicianId}
          disabled={isSaving}
          error={error}
          onChange={(event) => selectTechnician(event.target.value)}
        />
      )}
      <AssignmentOptions
        kind="categories"
        rows={categories}
        value={categoryIds}
        onChange={(ids) => form.setValue('categoryIds', ids)}
        disabled={isSaving || !technicianId}
      />
    </AssignmentDialog>
  )
}
