import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { AdminCatalogConfig } from '../domain/catalogs'
import { useCatalogManager } from '../hooks/use-catalog-manager'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { CatalogForm } from './catalog-form'
import { CatalogSortControl } from './catalog-sort-control'
import { CatalogTable } from './catalog-table'
import { DependencyFormDialog } from './dependency-form'
import { EntityDialog } from './entity-dialog'

type Manager = ReturnType<typeof useCatalogManager>

function rowName(config: AdminCatalogConfig, row: Record<string, unknown>) {
  const key = config.tree?.labelKey ?? config.columns[0]?.key
  return key ? String(row[key] ?? '') : ''
}

function EditDialog({
  config,
  manager,
}: {
  config: AdminCatalogConfig
  manager: Manager
}) {
  const editing = manager.editing
  if (!editing) return null
  if (config.key === 'dependencies') {
    return (
      <DependencyFormDialog
        dependency={editing === 'new' ? undefined : editing}
        onClose={() => manager.setEditing(null)}
      />
    )
  }
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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold">{config.title}</h2>
      {config.key === 'reasons' ? (
        <p className="text-sm text-muted-foreground">
          {adminMessages.reasonsHelp}
        </p>
      ) : null}
      <AdminToolbar
        query={manager.query}
        onQueryChange={manager.setQuery}
        countText={`${manager.count} ${list.results}`}
        addLabel={actions.add}
        onAdd={() => manager.setEditing('new')}
      />
      <CatalogSortControl
        columns={manager.sortableColumns}
        sort={manager.sort}
        onSelect={manager.selectSort}
        onToggleDirection={manager.toggleDirection}
      />
      {manager.rows.isLoading ? <LoadingList rows={4} /> : null}
      {manager.rows.isError ? <ErrorAlert message={list.error} /> : null}
      {manager.rows.data ? (
        <CatalogTable
          rows={manager.visibleRows}
          columns={manager.columns}
          tree={config.tree}
          isFiltering={manager.isFiltering}
          optionsFor={manager.optionsFor}
          sort={manager.sort}
          onSortChange={manager.toggleSort}
          onEdit={(row) => manager.setEditing(row)}
          onToggle={manager.toggle}
          onDelete={(row) => manager.setDeleting(row)}
        />
      ) : null}
      <EditDialog config={config} manager={manager} />
      {manager.deleting && manager.deleting !== 'new' ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) manager.setDeleting(null)
          }}
          title={actions.deleteTitle}
          description={actions.deleteHelp(rowName(config, manager.deleting))}
          confirmLabel={actions.delete}
          destructive
          isPending={manager.isDeleting}
          onConfirm={manager.handleDelete}
        />
      ) : null}
      {manager.isError ? <ErrorAlert message={manager.errorMessage} /> : null}
    </div>
  )
}
