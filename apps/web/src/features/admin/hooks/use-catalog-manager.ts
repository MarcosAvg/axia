import { useState } from 'react'
import { toast } from 'sonner'
import type { AdminTable } from '../api/admin-api'
import { optionSourcesFor } from '../domain/catalog-options'
import type { AdminCatalogConfig } from '../domain/catalogs'
import { adminMessages } from '../i18n'
import {
  useAdminOptions,
  useAdminRows,
  useAdminSave,
} from './use-admin-catalog'
import type { AdminOption } from './use-admin-catalog'

type Editing = Record<string, unknown> | 'new' | null
type Values = Record<string, string | number | boolean | null>

/** Estado y acciones del gestor de un catálogo. */
export function useCatalogManager(config: AdminCatalogConfig) {
  const rows = useAdminRows(config.table, config.orderBy)
  const options = useAdminOptions(optionSourcesFor(config))
  const save = useAdminSave()
  const [editing, setEditing] = useState<Editing>(null)

  const optionsFor = (table: AdminTable): AdminOption[] =>
    options.get(table) ?? []

  function handleSave(values: Values) {
    const id = editing && editing !== 'new' ? String(editing.id) : undefined
    save.mutate(
      { table: config.table, id, values },
      {
        onSuccess: () => {
          setEditing(null)
          toast.success(adminMessages.actions.saved)
        },
        onError: () => toast.error(adminMessages.actions.error),
      },
    )
  }

  function toggle(row: Record<string, unknown>) {
    save.mutate(
      {
        table: config.table,
        id: String(row.id),
        values: { active: row.active !== true },
      },
      {
        onError: () => toast.error(adminMessages.actions.error),
      },
    )
  }

  return {
    rows,
    editing,
    setEditing,
    optionsFor,
    handleSave,
    toggle,
    isSaving: save.isPending,
    isError: save.isError,
  }
}
