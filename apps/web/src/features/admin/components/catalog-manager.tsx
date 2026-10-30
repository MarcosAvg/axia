import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import type { AdminCatalogConfig } from '../domain/catalogs'
import { useCatalogManager } from '../hooks/use-catalog-manager'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { CatalogForm } from './catalog-form'
import { CatalogTable } from './catalog-table'
import { DependencyLocationsDialog } from './dependency-locations-dialog'
import { EntityDialog } from './entity-dialog'

type Manager = ReturnType<typeof useCatalogManager>

function EditDialog({
  config,
  manager,
}: {
  config: AdminCatalogConfig
  manager: Manager
}) {
  const editing = manager.editing
  if (!editing) return null
  const { form } = adminMessages
  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) manager.setEditing(null)
      }}
      title={editing === 'new' ? form.newTitle : form.editTitle}
      description={editing === 'new' ? form.newHelp : form.editHelp}
    >
      <CatalogForm
        fields={config.fields}
        row={editing === 'new' ? undefined : editing}
        optionsFor={manager.optionsFor}
        isSaving={manager.isSaving}
        onSave={manager.handleSave}
        onCancel={() => manager.setEditing(null)}
      />
    </EntityDialog>
  )
}

/** Gestor de un catálogo: lista con búsqueda y orden, alta, edición y activar/desactivar. */
export function CatalogManager({ config }: { config: AdminCatalogConfig }) {
  const manager = useCatalogManager(config)
  const { actions, list } = adminMessages
  const [locationsFor, setLocationsFor] = useState<Record<
    string,
    unknown
  > | null>(null)

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold">{config.title}</h2>
      <AdminToolbar
        query={manager.query}
        onQueryChange={manager.setQuery}
        countText={`${manager.count} ${list.results}`}
        addLabel={actions.add}
        onAdd={() => manager.setEditing('new')}
      />
      {manager.rows.isLoading ? <LoadingList rows={4} /> : null}
      {manager.rows.isError ? <ErrorAlert message={list.error} /> : null}
      {manager.rows.data ? (
        <CatalogTable
          rows={manager.visibleRows}
          columns={config.columns}
          optionsFor={manager.optionsFor}
          sort={manager.sort}
          onSortChange={manager.toggleSort}
          onEdit={(row) => manager.setEditing(row)}
          onToggle={manager.toggle}
          onLocations={
            config.key === 'dependencies' ? setLocationsFor : undefined
          }
        />
      ) : null}
      <EditDialog config={config} manager={manager} />
      {manager.isError ? <ErrorAlert message={actions.error} /> : null}
      {locationsFor ? (
        <DependencyLocationsDialog
          dependency={locationsFor}
          onClose={() => setLocationsFor(null)}
        />
      ) : null}
    </div>
  )
}
