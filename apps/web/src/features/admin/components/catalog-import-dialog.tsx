import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { catalogImportMessages } from '../domain/catalog-import-messages'
import { CatalogImportPanel } from './catalog-import-panel'
import { EntityDialog } from './entity-dialog'

/** Botón que abre el diálogo de importación de catálogos. */
export function CatalogImportDialog() {
  const [open, setOpen] = useState(false)
  const t = catalogImportMessages

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t.import}
      </Button>
      {open ? (
        <EntityDialog
          open
          onOpenChange={(next) => {
            if (!next) setOpen(false)
          }}
          title={t.title}
          description={t.help}
        >
          <CatalogImportPanel />
        </EntityDialog>
      ) : null}
    </>
  )
}
