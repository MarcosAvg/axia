import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TICKET_STATUSES, statusLabels } from '@/features/tickets'
import type { TicketStatus } from '@/features/tickets'
import { formatDateTime } from '@/lib/format'
import type { ImportBatchRow, StatusMapRow } from '../api/import-api'
import {
  useImportBatches,
  useSetStatusMap,
  useStatusMaps,
} from '../hooks/use-imports'
import { adminMessages } from '../i18n'

const t = adminMessages.integrations
const statusOptions = TICKET_STATUSES.map((value) => ({
  value,
  label: statusLabels[value],
}))

interface StatusMapValues {
  system: string
  externalStatus: string
  ticketStatus: TicketStatus
}

function StatusMapFields({
  values,
  onChange,
}: {
  values: StatusMapValues
  onChange: (patch: Partial<StatusMapValues>) => void
}) {
  return (
    <>
      <div className="w-48">
        <TextField
          id="import-system"
          label={t.system}
          value={values.system}
          onChange={(event) => onChange({ system: event.target.value })}
        />
      </div>
      <div className="w-48">
        <TextField
          id="import-external-status"
          label={t.externalStatus}
          value={values.externalStatus}
          onChange={(event) => onChange({ externalStatus: event.target.value })}
        />
      </div>
      <div className="w-56">
        <SelectField
          id="import-ticket-status"
          label={t.ticketStatus}
          options={statusOptions}
          value={values.ticketStatus}
          onChange={(event) =>
            onChange({ ticketStatus: event.target.value as TicketStatus })
          }
        />
      </div>
    </>
  )
}

function StatusMapForm() {
  const setMap = useSetStatusMap()
  const [values, setValues] = useState<StatusMapValues>({
    system: '',
    externalStatus: '',
    ticketStatus: 'registered',
  })
  const onChange = (patch: Partial<StatusMapValues>) =>
    setValues((current) => ({ ...current, ...patch }))

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.system.trim() || !values.externalStatus.trim()) return
    setMap.mutate(
      {
        system: values.system.trim(),
        externalStatus: values.externalStatus.trim(),
        ticketStatus: values.ticketStatus,
      },
      {
        onSuccess: () => {
          toast.success(t.saved)
          onChange({ externalStatus: '' })
        },
        onError: () => toast.error(adminMessages.actions.error),
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <StatusMapFields values={values} onChange={onChange} />
      <Button type="submit" disabled={setMap.isPending} className="min-h-11">
        {t.save}
      </Button>
    </form>
  )
}

function StatusMapTable({ rows }: { rows: StatusMapRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.system}</TableHead>
          <TableHead>{t.externalStatus}</TableHead>
          <TableHead>{t.ticketStatus}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.system}</TableCell>
            <TableCell>{row.externalStatus}</TableCell>
            <TableCell>{statusLabels[row.ticketStatus]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function BatchesTable({ rows }: { rows: ImportBatchRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.system}</TableHead>
          <TableHead>{t.mode}</TableHead>
          <TableHead>{t.status}</TableHead>
          <TableHead>{t.started}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.system}</TableCell>
            <TableCell>
              {row.mode === 'commit' ? t.modes.commit : t.modes.dry_run}
            </TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{formatDateTime(row.startedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Administración de la importación: mapeo de estatus y lotes. */
export function IntegrationManager() {
  const statusMaps = useStatusMaps()
  const batches = useImportBatches()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-medium">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.help}</p>
      </header>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t.statusMap}</h3>
        <StatusMapForm />
        {statusMaps.isLoading ? <LoadingList rows={2} /> : null}
        {statusMaps.isError ? (
          <ErrorAlert message={adminMessages.list.error} />
        ) : null}
        {statusMaps.data ? <StatusMapTable rows={statusMaps.data} /> : null}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t.batches}</h3>
        {batches.isLoading ? <LoadingList rows={2} /> : null}
        {batches.isError ? (
          <ErrorAlert message={adminMessages.list.error} />
        ) : null}
        {batches.data ? <BatchesTable rows={batches.data} /> : null}
      </section>
    </div>
  )
}
