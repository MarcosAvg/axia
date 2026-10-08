import { ErrorAlert } from '@/components/shared/async-state'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AdminTable } from '../api/admin-api'
import type { AdminCatalogConfig, AdminField } from '../domain/catalogs'
import { useCatalogManager } from '../hooks/use-catalog-manager'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { CatalogForm } from './catalog-form'
import { CatalogTable } from './catalog-table'

type Editing = Record<string, unknown> | 'new' | null
type Values = Record<string, string | number | boolean | null>

function CatalogDialog({
  editing,
  fields,
  optionsFor,
  isSaving,
  onSave,
  onCancel,
}: {
  editing: Exclude<Editing, null>
  fields: AdminField[]
  optionsFor: (table: AdminTable) => AdminOption[]
  isSaving: boolean
  onSave: (values: Values) => void
  onCancel: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing === 'new'
              ? adminMessages.form.newTitle
              : adminMessages.form.editTitle}
          </DialogTitle>
        </DialogHeader>
        <CatalogForm
          fields={fields}
          row={editing === 'new' ? undefined : editing}
          optionsFor={optionsFor}
          isSaving={isSaving}
          onSave={onSave}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Gestor de un catálogo: lista, alta, edición y activar/desactivar. */
export function CatalogManager({ config }: { config: AdminCatalogConfig }) {
  const manager = useCatalogManager(config)
  const { actions, list } = adminMessages

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{config.title}</h2>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => manager.setEditing('new')}
        >
          {actions.add}
        </Button>
      </div>
      {manager.rows.isLoading ? (
        <p className="text-sm text-muted-foreground">{list.loading}</p>
      ) : null}
      {manager.rows.isError ? <ErrorAlert message={list.error} /> : null}
      {manager.rows.data ? (
        <CatalogTable
          rows={manager.rows.data}
          columns={config.columns}
          optionsFor={manager.optionsFor}
          onEdit={(row) => manager.setEditing(row)}
          onToggle={manager.toggle}
        />
      ) : null}
      {manager.editing ? (
        <CatalogDialog
          editing={manager.editing}
          fields={config.fields}
          optionsFor={manager.optionsFor}
          isSaving={manager.isSaving}
          onSave={manager.handleSave}
          onCancel={() => manager.setEditing(null)}
        />
      ) : null}
      {manager.isError ? <ErrorAlert message={actions.error} /> : null}
    </div>
  )
}
