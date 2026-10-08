import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextField } from '@/components/shared/form-fields'
import { AliasResolver } from './alias-resolver'
import type { PendingAlias } from './alias-resolver'
import { StatusResolver } from './status-resolver'
import {
  useImportRun,
  type AnalyzeResult,
  type RowAnalysis,
} from '../hooks/use-import-run'
import { importMessages } from '../i18n'

function pendingAliases(rows: RowAnalysis[]): PendingAlias[] {
  const seen = new Set<string>()
  const items: PendingAlias[] = []
  for (const row of rows) {
    for (const name of row.unresolved) {
      const alias = row.candidate.names[name]
      if (!alias) continue
      const key = `${name}|${alias.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({ catalogName: name, alias })
    }
  }
  return items
}

function pendingStatuses(rows: RowAnalysis[]): string[] {
  const seen = new Set<string>()
  for (const row of rows) {
    if (row.kind === 'status' && row.candidate.statusText) {
      seen.add(row.candidate.statusText)
    }
  }
  return [...seen]
}

function ImportForm({
  system,
  busy,
  onSystem,
  onFile,
  onAnalyze,
}: {
  system: string
  busy: boolean
  onSystem: (value: string) => void
  onFile: (file: File | null) => void
  onAnalyze: () => void
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onAnalyze()
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="w-48">
        <TextField
          id="import-source-system"
          label={importMessages.system}
          value={system}
          onChange={(event) => onSystem(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="import-file">{importMessages.file}</Label>
        <Input
          id="import-file"
          type="file"
          accept=".csv,.xlsx"
          className="min-h-11"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </div>
      <Button type="submit" disabled={busy} className="min-h-11">
        {busy ? importMessages.analyzing : importMessages.analyze}
      </Button>
    </form>
  )
}

function ImportResult({
  result,
  system,
  busy,
  onSaved,
  onCommit,
}: {
  result: AnalyzeResult
  system: string
  busy: boolean
  onSaved: () => void
  onCommit: () => void
}) {
  const r = importMessages.report
  const counts = [
    { label: r.total, value: result.report.total },
    { label: r.ok, value: result.report.ok },
    { label: r.alias, value: result.report.alias },
    { label: r.status, value: result.report.status },
    { label: r.invalid, value: result.report.invalid },
  ]
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <h3 className="text-sm font-medium">{r.title}</h3>
      <ul className="flex flex-wrap gap-4 text-sm">
        {counts.map((item) => (
          <li key={item.label}>
            <span className="text-muted-foreground">{item.label}: </span>
            <span className="font-medium">{item.value}</span>
          </li>
        ))}
      </ul>
      <AliasResolver items={pendingAliases(result.rows)} onSaved={onSaved} />
      <StatusResolver
        system={system}
        items={pendingStatuses(result.rows)}
        onSaved={onSaved}
      />
      <p className="text-xs text-muted-foreground">
        {importMessages.reanalyze}
      </p>
      <Button
        type="button"
        disabled={busy || result.report.ok === 0}
        className="min-h-11 self-start"
        onClick={onCommit}
      >
        {busy ? importMessages.importing : importMessages.import}
      </Button>
    </div>
  )
}

function useImportPanel() {
  const { analyze, commit } = useImportRun()
  const [system, setSystem] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [imported, setImported] = useState<number | null>(null)

  async function runAnalyze() {
    if (!system.trim() || !file) {
      toast.error(importMessages.needSystem)
      return
    }
    setBusy(true)
    setImported(null)
    try {
      setResult(await analyze(file, system.trim()))
    } catch {
      toast.error(importMessages.error)
    } finally {
      setBusy(false)
    }
  }

  async function runCommit() {
    if (!result) return
    setBusy(true)
    try {
      const done = await commit(result.rows, system.trim())
      setImported(done.inserted)
      setResult(null)
    } catch {
      toast.error(importMessages.error)
    } finally {
      setBusy(false)
    }
  }

  return {
    system,
    setSystem,
    setFile,
    result,
    busy,
    imported,
    runAnalyze,
    runCommit,
  }
}

/** Panel del adaptador: subir archivo, analizar y confirmar. */
export function ImportPanel() {
  const panel = useImportPanel()

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="text-lg font-medium">{importMessages.title}</h2>
        <p className="text-sm text-muted-foreground">{importMessages.help}</p>
      </header>
      <ImportForm
        system={panel.system}
        busy={panel.busy}
        onSystem={panel.setSystem}
        onFile={panel.setFile}
        onAnalyze={() => {
          void panel.runAnalyze()
        }}
      />
      {panel.imported !== null ? (
        <p role="status" className="text-sm text-muted-foreground">
          {importMessages.imported(panel.imported)}
        </p>
      ) : null}
      {panel.result ? (
        <ImportResult
          result={panel.result}
          system={panel.system.trim()}
          busy={panel.busy}
          onSaved={panel.runAnalyze}
          onCommit={() => {
            void panel.runCommit()
          }}
        />
      ) : null}
    </div>
  )
}
