import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { FormSection } from '@/components/shared/form-section'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { TICKET_STATUSES, statusLabels } from '@/features/tickets'
import type { TicketStatus } from '@/features/tickets'
import { formatDateTime } from '@/lib/format'
import type {
  ImportBatchRow,
  IntegrationTaskRow,
  StatusMapRow,
} from '../api/import-api'
import {
  useImportBatches,
  useIntegrationTasks,
  useResolveIntegrationTask,
  useSetStatusMap,
  useStatusMaps,
} from '../hooks/use-imports'
import { adminMessages } from '../i18n'

const t = adminMessages.integrations
const statusOptions = TICKET_STATUSES.map((value) => ({
  value,
  label: statusLabels[value],
}))

function EmptyRow() {
  return <p className="text-sm text-muted-foreground">{t.empty}</p>
}

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
      <Button type="submit" disabled={setMap.isPending}>
        {t.save}
      </Button>
    </form>
  )
}

const statusMapColumns: DataTableColumn<StatusMapRow>[] = [
  { id: 'system', header: t.system, cell: (row) => row.system },
  {
    id: 'externalStatus',
    header: t.externalStatus,
    cell: (row) => row.externalStatus,
  },
  {
    id: 'ticketStatus',
    header: t.ticketStatus,
    cell: (row) => statusLabels[row.ticketStatus],
  },
]

const batchColumns: DataTableColumn<ImportBatchRow>[] = [
  { id: 'system', header: t.system, cell: (row) => row.system },
  {
    id: 'mode',
    header: t.mode,
    cell: (row) => (row.mode === 'commit' ? t.modes.commit : t.modes.dry_run),
  },
  { id: 'status', header: t.status, cell: (row) => row.status },
  {
    id: 'started',
    header: t.started,
    cell: (row) => formatDateTime(row.startedAt),
  },
]

function taskStateLabel(status: string): string {
  const states = t.taskStates as Record<string, string>
  return states[status] ?? status
}

function tagColumns(
  onResolve: (id: string) => void,
): DataTableColumn<IntegrationTaskRow>[] {
  return [
    { id: 'folio', header: t.taskTicket, cell: (row) => row.folio ?? '—' },
    {
      id: 'description',
      header: t.taskDescription,
      cell: (row) => row.description,
    },
    { id: 'due', header: t.taskDue, cell: (row) => row.dueDate ?? '—' },
    {
      id: 'status',
      header: t.taskStatus,
      cell: (row) => taskStateLabel(row.status),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) =>
        row.status === 'open' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onResolve(row.id)}
          >
            {t.resolve}
          </Button>
        ) : null,
    },
  ]
}

function IntegrationTasks() {
  const tasks = useIntegrationTasks()
  const resolve = useResolveIntegrationTask()
  return (
    <FormSection title={t.tasks}>
      {tasks.isLoading ? <LoadingList rows={2} /> : null}
      {tasks.isError ? <ErrorAlert message={adminMessages.list.error} /> : null}
      {tasks.data ? (
        <DataTable
          columns={tagColumns((id) => resolve.mutate(id))}
          rows={tasks.data}
          getRowId={(row) => row.id}
          empty={<EmptyRow />}
        />
      ) : null}
    </FormSection>
  )
}

/** Administración de la importación: mapeo de estatus, lotes y convivencia. */
export function IntegrationManager() {
  const statusMaps = useStatusMaps()
  const batches = useImportBatches()

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{t.help}</p>
      <FormSection title={t.statusMap}>
        <StatusMapForm />
        {statusMaps.isLoading ? <LoadingList rows={2} /> : null}
        {statusMaps.isError ? (
          <ErrorAlert message={adminMessages.list.error} />
        ) : null}
        {statusMaps.data ? (
          <DataTable
            columns={statusMapColumns}
            rows={statusMaps.data}
            getRowId={(row) => row.id}
            empty={<EmptyRow />}
          />
        ) : null}
      </FormSection>
      <FormSection title={t.batches}>
        {batches.isLoading ? <LoadingList rows={2} /> : null}
        {batches.isError ? (
          <ErrorAlert message={adminMessages.list.error} />
        ) : null}
        {batches.data ? (
          <DataTable
            columns={batchColumns}
            rows={batches.data}
            getRowId={(row) => row.id}
            empty={<EmptyRow />}
          />
        ) : null}
      </FormSection>
      <IntegrationTasks />
    </div>
  )
}
