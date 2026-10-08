import { useState } from 'react'
import { toast } from 'sonner'
import { SelectField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { CATALOG_BY_NAME } from '../adapters/candidates'
import type { CatalogName } from '../adapters/candidates'
import { setAlias } from '../api/import-run-api'
import { useCatalogOptions } from '../hooks/use-catalog-options'
import { catalogLabels, importMessages } from '../i18n'

export interface PendingAlias {
  catalogName: CatalogName
  alias: string
}

function AliasRow({
  item,
  onSaved,
}: {
  item: PendingAlias
  onSaved: () => void
}) {
  const options = useCatalogOptions(CATALOG_BY_NAME[item.catalogName])
  const [recordId, setRecordId] = useState('')

  async function save() {
    if (!recordId) return
    await setAlias(CATALOG_BY_NAME[item.catalogName], item.alias, recordId)
    toast.success(importMessages.aliases.save)
    onSaved()
  }

  return (
    <li className="flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1">
        <SelectField
          id={`alias-${item.catalogName}-${item.alias}`}
          label={`${catalogLabels[item.catalogName]}: ${item.alias}`}
          placeholder="Selecciona…"
          options={(options.data ?? []).map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          value={recordId}
          onChange={(event) => setRecordId(event.target.value)}
        />
      </div>
      <Button
        type="button"
        className="min-h-11"
        disabled={!recordId}
        onClick={() => {
          void save()
        }}
      >
        {importMessages.aliases.save}
      </Button>
    </li>
  )
}

/** Resuelve alias de catálogo sin mapear. */
export function AliasResolver({
  items,
  onSaved,
}: {
  items: PendingAlias[]
  onSaved: () => void
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{importMessages.aliases.title}</h4>
      <p className="text-xs text-muted-foreground">
        {importMessages.aliases.help}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <AliasRow
            key={`${item.catalogName}|${item.alias}`}
            item={item}
            onSaved={onSaved}
          />
        ))}
      </ul>
    </section>
  )
}
