import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { LinkablePerson } from '../domain/access'
import { nameById } from '../domain/lookups'
import { filterDesignations, groupDesignations } from '../domain/scope-list'
import type { TechnicianDesignation } from '../domain/scope-list'
import {
  useAddTechnicianCategory,
  usePeople,
  useRemoveTechnicianCategory,
  useTechnicianCategories,
} from '../hooks/use-access'
import { useAdminRows } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { DesignationDialog } from './designation-dialog'

function orEmpty<T>(rows: T[] | undefined): T[] {
  return rows ?? []
}

function technicianName(people: LinkablePerson[], id: string): string {
  const found = people.find((person) => person.id === id)
  return found ? found.fullName : '—'
}

function CategoryChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  const { scopes: t } = adminMessages
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
      {label}
      <button
        type="button"
        aria-label={`${t.remove}: ${label}`}
        className="inline-flex size-6 items-center justify-center rounded-full outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onRemove}
      >
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}

interface DesignationLabels {
  technician: (id: string) => string
  category: (id: string) => string
  onRemove: (technicianId: string, categoryId: string) => void
}

function buildDesignationColumns(
  labels: DesignationLabels,
): DataTableColumn<TechnicianDesignation>[] {
  const { scopes: t } = adminMessages
  return [
    {
      id: 'technician',
      header: t.technicianName,
      sortable: true,
      cell: (designation) => (
        <span className="font-medium">
          {labels.technician(designation.technicianId)}
        </span>
      ),
    },
    {
      id: 'categories',
      header: t.categories,
      cell: (designation) => {
        if (designation.categoryIds.length === 0) {
          return <span className="text-muted-foreground">—</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {designation.categoryIds.map((categoryId) => (
              <CategoryChip
                key={categoryId}
                label={labels.category(categoryId)}
                onRemove={() =>
                  labels.onRemove(designation.technicianId, categoryId)
                }
              />
            ))}
          </div>
        )
      },
    },
  ]
}

function DesignationTable({
  rows,
  technician,
  category,
  onRemove,
}: {
  rows: TechnicianDesignation[]
  technician: (id: string) => string
  category: (id: string) => string
  onRemove: (technicianId: string, categoryId: string) => void
}) {
  return (
    <DataTable
      columns={buildDesignationColumns({ technician, category, onRemove })}
      rows={rows}
      getRowId={(designation) => designation.technicianId}
    />
  )
}

function DesignationToolbar({
  query,
  count,
  onQuery,
  onAdd,
}: {
  query: string
  count: number
  onQuery: (value: string) => void
  onAdd: () => void
}) {
  const { scopes: t, list } = adminMessages
  return (
    <AdminToolbar
      query={query}
      onQueryChange={onQuery}
      searchPlaceholder={t.searchDesignations}
      countText={`${count} ${list.results}`}
      addLabel={t.addDesignation}
      onAdd={onAdd}
    />
  )
}

/** Designaciones de técnicos a categorías. */
export function TechnicianCategories() {
  const designations = useTechnicianCategories()
  const people = usePeople()
  const categories = useAdminRows('categories')
  const add = useAddTechnicianCategory()
  const remove = useRemoveTechnicianCategory()
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const { list } = adminMessages

  const technicians = orEmpty(people.data?.technicians)
  const categoryRows = orEmpty(categories.data)
  const technician = (id: string) => technicianName(technicians, id)
  const category = (id: string) => nameById(categoryRows, id)
  const rows = groupDesignations(orEmpty(designations.data))
  const visible = filterDesignations(
    rows,
    (designation) =>
      `${technician(designation.technicianId)} ${designation.categoryIds
        .map(category)
        .join(' ')}`,
    query,
  )

  return (
    <div className="flex flex-col gap-4">
      <DesignationToolbar
        query={query}
        count={visible.length}
        onQuery={setQuery}
        onAdd={() => setCreating(true)}
      />
      {designations.isLoading ? <LoadingList rows={3} /> : null}
      {designations.isError ? <ErrorAlert message={list.error} /> : null}
      {designations.data ? (
        <DesignationTable
          rows={visible}
          technician={technician}
          category={category}
          onRemove={(technicianId, categoryId) =>
            remove.mutate({ technicianId, categoryId })
          }
        />
      ) : null}
      {creating ? (
        <DesignationDialog
          technicians={technicians}
          categories={categoryRows}
          isSaving={add.isPending}
          onCreate={(technicianId, categoryId) =>
            add.mutate(
              { technicianId, categoryId },
              { onSuccess: () => setCreating(false) },
            )
          }
          onClose={() => setCreating(false)}
        />
      ) : null}
    </div>
  )
}
