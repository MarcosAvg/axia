import { useAdminRows } from '../hooks/use-admin-catalog'
import { nameById } from '../domain/lookups'
import {
  useAddTechnicianCategory,
  usePeople,
  useRemoveTechnicianCategory,
  useTechnicianCategories,
} from '../hooks/use-access'
import { adminMessages } from '../i18n'
import { DesignationForm } from './designation-form'
import { DesignationRow } from './designation-row'

/** Designaciones de técnicos a categorías. */
export function TechnicianCategories() {
  const designations = useTechnicianCategories()
  const people = usePeople()
  const categories = useAdminRows('categories')
  const add = useAddTechnicianCategory()
  const remove = useRemoveTechnicianCategory()
  const { scopes: t, list } = adminMessages

  const technicianName = (id: string) =>
    people.data?.technicians.find((person) => person.id === id)?.fullName ?? '—'

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{t.technician}</h2>
      {designations.isLoading ? (
        <p className="text-sm text-muted-foreground">{list.loading}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {(designations.data ?? []).map((designation) => (
            <DesignationRow
              key={`${designation.technicianId}-${designation.categoryId}`}
              designation={designation}
              technicianName={technicianName(designation.technicianId)}
              categoryName={nameById(categories.data, designation.categoryId)}
              onRemove={() => remove.mutate(designation)}
            />
          ))}
        </ul>
        <DesignationForm
          technicians={people.data?.technicians ?? []}
          categories={categories.data ?? []}
          isPending={add.isPending}
          onCreate={(technicianId, categoryId) =>
            add.mutate({ technicianId, categoryId })
          }
        />
      </div>
    </div>
  )
}
