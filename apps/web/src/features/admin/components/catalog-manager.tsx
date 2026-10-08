import { Button } from '@/components/ui/button'
import type { AdminCatalogConfig } from '../domain/catalogs'
import { useCatalogManager } from '../hooks/use-catalog-manager'
import { adminMessages } from '../i18n'
import { CatalogForm } from './catalog-form'
import { CatalogTable } from './catalog-table'

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
      {manager.rows.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {list.error}
        </p>
      ) : null}
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
        <CatalogForm
          fields={config.fields}
          row={manager.editing === 'new' ? undefined : manager.editing}
          optionsFor={manager.optionsFor}
          isSaving={manager.isSaving}
          onSave={manager.handleSave}
          onCancel={() => manager.setEditing(null)}
        />
      ) : null}
      {manager.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {actions.error}
        </p>
      ) : null}
    </div>
  )
}
