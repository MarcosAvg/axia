import { PencilIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TechnicianDesignation } from '../domain/scope-list'
import { adminMessages } from '../i18n'

export interface DesignationLabels {
  technician: (id: string) => string
  category: (id: string) => string
  onEdit: (designation: TechnicianDesignation) => void
}

export function DesignationCategories({
  designation,
  category,
}: {
  designation: TechnicianDesignation
  category: DesignationLabels['category']
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {designation.categoryIds.map((id) => (
        <Badge
          key={id}
          variant="secondary"
          className="h-auto whitespace-normal"
        >
          {category(id)}
        </Badge>
      ))}
    </div>
  )
}

export function EditCategories({
  designation,
  labels,
}: {
  designation: TechnicianDesignation
  labels: DesignationLabels
}) {
  const title = adminMessages.scopes.editCategories
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-11"
      aria-label={`${title}: ${labels.technician(designation.technicianId)}`}
      onClick={() => labels.onEdit(designation)}
    >
      <PencilIcon />
      {title}
    </Button>
  )
}

export function DesignationCards({
  rows,
  labels,
}: {
  rows: TechnicianDesignation[]
  labels: DesignationLabels
}) {
  return (
    <ul className="flex flex-col gap-2 lg:hidden">
      {rows.map((designation) => (
        <li
          key={designation.technicianId}
          className="flex flex-col gap-3 rounded-xl border bg-card p-3"
        >
          <p className="font-medium">
            {labels.technician(designation.technicianId)}
          </p>
          <DesignationCategories
            designation={designation}
            category={labels.category}
          />
          <div className="flex justify-end">
            <EditCategories designation={designation} labels={labels} />
          </div>
        </li>
      ))}
    </ul>
  )
}
