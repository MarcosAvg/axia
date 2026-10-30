import { Button } from '@/components/ui/button'
import type { ImportReport } from '../api/catalog-transfer-api'
import { DEPENDENCY_SHEET } from '../api/catalog-workbook'
import { CATALOG_IMPORT_SPECS } from '../domain/catalog-import'
import { useCatalogTransfer } from '../hooks/use-catalog-transfer'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'

const t = adminMessages.transfer

type Transfer = ReturnType<typeof useCatalogTransfer>

function totalsOf(report: ImportReport[]) {
  return report.reduce(
    (sum, item) => ({
      inserted: sum.inserted + item.inserted,
      updated: sum.updated + item.updated,
      invalid: sum.invalid + item.invalid,
      errors: sum.errors + item.errors,
    }),
    { inserted: 0, updated: 0, invalid: 0, errors: 0 },
  )
}

function Preview({ transfer }: { transfer: Transfer }) {
  if (!transfer.workbook) return null
  const dependencies = transfer.workbook.dependencies
  const rows = [
    ...CATALOG_IMPORT_SPECS.filter((spec) => spec.key !== 'dependencies').map(
      (spec) => ({
        title: spec.title,
        count: transfer.workbook?.sheets[spec.key]?.length ?? 0,
      }),
    ),
    ...(dependencies.length > 0
      ? [{ title: DEPENDENCY_SHEET, count: dependencies.length }]
      : []),
  ].filter((item) => item.count > 0)

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t.fileLabel(transfer.fileName)}
      </p>
      <ul className="flex min-h-0 flex-col gap-1 overflow-auto text-sm">
        {rows.map((item) => (
          <li key={item.title} className="flex justify-between gap-3">
            <span>{item.title}</span>
            <span className="text-muted-foreground">
              {item.count} {t.rows}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={transfer.cancel}
          disabled={transfer.busy}
        >
          {t.cancel}
        </Button>
        <Button onClick={() => void transfer.apply()} disabled={transfer.busy}>
          {transfer.busy ? t.importing : t.import}
        </Button>
      </div>
    </div>
  )
}

function Result({ transfer }: { transfer: Transfer }) {
  if (!transfer.report) return null
  const totals = totalsOf(transfer.report)

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <p role="status" className="text-sm">
        {t.summary(
          totals.inserted,
          totals.updated,
          totals.invalid,
          totals.errors,
        )}
      </p>
      <ul className="flex min-h-0 flex-col gap-1 overflow-auto text-sm">
        {transfer.report.map((item) => (
          <li key={item.catalog} className="flex justify-between gap-3">
            <span>{item.title}</span>
            <span className="text-muted-foreground">
              {item.inserted} {t.inserted} · {item.updated} {t.updated} ·{' '}
              {item.invalid} {t.invalid}
            </span>
          </li>
        ))}
      </ul>
      {transfer.issues.length > 0 ? (
        <ul className="flex min-h-0 flex-col gap-1 overflow-auto text-sm text-destructive">
          {transfer.issues.map((issue, index) => (
            <li key={`${issue.catalog}-${issue.row}-${index}`}>
              {issue.catalog}, {t.row} {issue.row}: {issue.messages.join('; ')}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noIssues}</p>
      )}
      <Button className="self-end" onClick={transfer.close}>
        {t.close}
      </Button>
    </div>
  )
}

/** Exportación e importación de todos los catálogos en un solo XLSX. */
export function CatalogTransfer() {
  const transfer = useCatalogTransfer()

  return (
    <>
      <Button
        variant="outline"
        disabled={transfer.busy}
        onClick={() => void transfer.exportAll()}
      >
        {t.export}
      </Button>
      <Button asChild variant="outline">
        <label>
          {t.import}
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              event.target.value = ''
              void transfer.choose(file)
            }}
          />
        </label>
      </Button>
      <EntityDialog
        open={Boolean(transfer.workbook || transfer.report)}
        onOpenChange={(open) => {
          if (!open) transfer.dismiss()
        }}
        title={transfer.workbook ? t.confirmTitle : t.reportTitle}
        description={transfer.workbook ? t.confirmHelp : undefined}
      >
        {transfer.workbook ? (
          <Preview transfer={transfer} />
        ) : (
          <Result transfer={transfer} />
        )}
      </EntityDialog>
    </>
  )
}
