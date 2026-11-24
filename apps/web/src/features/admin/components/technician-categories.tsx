import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { nameById } from '../domain/lookups'
import { filterDesignations, groupDesignations } from '../domain/scope-list'
import type { TechnicianDesignation } from '../domain/scope-list'
import {
  usePeople,
  useSetTechnicianCategories,
  useTechnicianCategories,
} from '../hooks/use-access'
import { useAdminRows } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { DesignationDialog } from './designation-dialog'
import {
  DesignationCards,
  DesignationCategories,
  EditCategories,
} from './technician-designation-cards'
import type { DesignationLabels } from './technician-designation-cards'

const { scopes: t, list } = adminMessages

function buildDesignationColumns(
  labels: DesignationLabels,
): DataTableColumn<TechnicianDesignation>[] {
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
      cell: (designation) => (
        <DesignationCategories
          designation={designation}
          category={labels.category}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (designation) => (
        <EditCategories designation={designation} labels={labels} />
      ),
    },
  ]
}

function useDesignations(query: string) {
  const designations = useTechnicianCategories()
  const people = usePeople()
  const categories = useAdminRows('categories')
  const save = useSetTechnicianCategories()
  const queries = [designations, people, categories]
  const technicians = people.data?.technicians ?? []
  const technician = (id: string) =>
    technicians.find((person) => person.id === id)?.fullName ?? '—'
  const category = (id: string) => nameById(categories.data, id)
  const rows = groupDesignations(designations.data ?? [])
  const visible = filterDesignations(
    rows,
    (designation) =>
      `${technician(designation.technicianId)} ${designation.categoryIds.map(category).join(' ')}`,
    query,
  )

  return {
    isLoading: queries.some((item) => item.isLoading),
    isError: queries.some((item) => item.isError),
    ready: queries.every((item) => item.isSuccess),
    rows,
    save,
    visible,
    technician,
    category,
    technicians,
    categoryRows: categories.data ?? [],
  }
}

/** Designaciones de técnicos a categorías. */
export function TechnicianCategories() {
  const [editor, setEditor] = useState<TechnicianDesignation | 'new' | null>(
    null,
  )
  const [query, setQuery] = useState('')
  const model = useDesignations(query)
  const labels: DesignationLabels = {
    technician: model.technician,
    category: model.category,
    onEdit: setEditor,
  }
  const editing = editor && editor !== 'new' ? editor : undefined
  const close = () => setEditor(null)

  return (
    <div className="flex flex-col gap-4">
      <AdminToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={t.searchDesignations}
        countText={`${model.visible.length} ${list.results}`}
        addLabel={t.addDesignation}
        onAdd={model.ready ? () => setEditor('new') : undefined}
      />
      {model.isLoading ? <LoadingList rows={3} /> : null}
      {model.isError ? <ErrorAlert message={list.error} /> : null}
      {model.ready ? (
        <>
          <DesignationCards rows={model.visible} labels={labels} />
          <div className="hidden lg:block">
            <DataTable
              columns={buildDesignationColumns(labels)}
              rows={model.visible}
              getRowId={(designation) => designation.technicianId}
            />
          </div>
        </>
      ) : null}
      {editor ? (
        <DesignationDialog
          technicians={model.technicians}
          categories={model.categoryRows}
          designations={model.rows}
          editing={editing}
          description={
            editing
              ? model.technician(editing.technicianId)
              : t.addDesignationHelp
          }
          isSaving={model.save.isPending}
          onClose={close}
          onSave={(values) => model.save.mutate(values, { onSuccess: close })}
        />
      ) : null}
    </div>
  )
}
