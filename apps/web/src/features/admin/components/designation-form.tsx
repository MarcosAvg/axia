import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/shared/form-fields'
import type { AdminRow } from '../api/admin-api'
import type { LinkablePerson } from '../domain/access'
import { adminMessages } from '../i18n'

interface DesignationFormProps {
  technicians: LinkablePerson[]
  categories: AdminRow[]
  isPending: boolean
  onCreate: (technicianId: string, categoryId: string) => void
}

/** Alta de una designación de técnico a categoría. */
export function DesignationForm({
  technicians,
  categories,
  isPending,
  onCreate,
}: DesignationFormProps) {
  const [technicianId, setTechnicianId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const { scopes: t } = adminMessages

  return (
    <div className="flex flex-col gap-3">
      <SelectField
        id="designation-technician"
        label={t.technicianName}
        placeholder="Selecciona…"
        options={technicians.map((person) => ({
          value: person.id,
          label: person.fullName,
        }))}
        value={technicianId}
        onChange={(event) => setTechnicianId(event.target.value)}
      />
      <SelectField
        id="designation-category"
        label={t.category}
        placeholder="Selecciona…"
        options={categories.map((category) => ({
          value: String(category.id),
          label: String(category.name),
        }))}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
      />
      <Button
        type="button"
        className="min-h-11 self-start"
        disabled={!technicianId || !categoryId || isPending}
        onClick={() => onCreate(technicianId, categoryId)}
      >
        {t.add}
      </Button>
    </div>
  )
}
