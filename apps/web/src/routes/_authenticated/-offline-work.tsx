import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { formatDateTime } from '@/lib/format'
import { offlineSessionExpiresAt } from '@/features/auth'
import { readyTicketDetails } from '@/app/query-persister'
import { fieldWorkCatalogOptions } from '@/features/catalogs'
import { Button } from '@/components/ui/button'
import {
  ticketDetailOptions,
  TicketList,
  TicketStatusSummary,
} from '@/features/tickets'
import type { TicketListItem } from '@/features/tickets'
import { currentOfflineUserId } from '@/lib/offline/user'
import { useOnline } from '@/lib/use-online'

const fetchOptions = { networkMode: 'always', retry: false } as const

async function prepareCatalogs(client: QueryClient) {
  const [technicians, services, priorities, pauseReasons] =
    fieldWorkCatalogOptions()
  const results = await Promise.allSettled([
    client.fetchQuery({ ...technicians, ...fetchOptions }),
    client.fetchQuery({ ...services, ...fetchOptions }),
    client.fetchQuery({ ...priorities, ...fetchOptions }),
    client.fetchQuery({ ...pauseReasons, ...fetchOptions }),
  ])
  return results.every((result) => result.status === 'fulfilled')
}

async function prepareTicket(client: QueryClient, id: string) {
  try {
    return Boolean(
      await client.fetchQuery({ ...ticketDetailOptions(id), ...fetchOptions }),
    )
  } catch {
    return false
  }
}

interface OfflineWorkProps {
  items: TicketListItem[]
  userId: string
}

function useTicketPreparation(userId: string) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [preparing, setPreparing] = useState(false)
  const [failed, setFailed] = useState(0)
  async function prepare(items: TicketListItem[]) {
    setPreparing(true)
    try {
      const catalogsReady = await prepareCatalogs(queryClient)
      const failedIds: string[] = []
      for (const { id } of items) {
        if (currentOfflineUserId() !== userId) return
        const prepared = await prepareTicket(queryClient, id)
        if (!prepared || !catalogsReady) failedIds.push(id)
      }
      setSelected(failedIds)
      setFailed(failedIds.length)
    } finally {
      setPreparing(false)
    }
  }

  return { selected, setSelected, preparing, failed, setFailed, prepare }
}

function TicketPicker({
  items,
  userId,
  ready,
}: OfflineWorkProps & { ready: Map<string, number> | undefined }) {
  const online = useOnline()
  const [open, setOpen] = useState(false)
  const { selected, setSelected, preparing, failed, setFailed, prepare } =
    useTicketPreparation(userId)
  const selectedItems = items.filter((item) => selected.includes(item.id))

  return (
    <details
      className="rounded-xl border bg-card p-4"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-medium">
        Preparar para trabajar sin conexión
      </summary>
      <p role="status" className="my-2 text-sm text-muted-foreground">
        {items.filter((item) => ready?.has(item.id)).length} de {items.length}{' '}
        tiquets disponibles sin conexión.
        {preparing ? ' Preparando tiquets…' : null}
        {failed > 0 ? ` ${failed} pendientes de reintentar.` : null}
      </p>
      {open ? (
        <ul className="my-3 space-y-2">
          {items.map((item) => (
            <TicketChoice
              key={item.id}
              item={item}
              savedAt={ready?.get(item.id)}
              checked={selected.includes(item.id)}
              disabled={!online || preparing}
              onChange={(checked) => {
                setSelected((ids) =>
                  checked
                    ? [...ids, item.id]
                    : ids.filter((id) => id !== item.id),
                )
                setFailed(0)
              }}
            />
          ))}
        </ul>
      ) : null}
      <Button
        disabled={!online || preparing || selectedItems.length === 0}
        onClick={() => void prepare(selectedItems)}
      >
        {failed > 0 ? 'Reintentar' : 'Preparar seleccionados'}
      </Button>
    </details>
  )
}

function TicketChoice({
  item,
  savedAt,
  checked,
  disabled,
  onChange,
}: {
  item: TicketListItem
  savedAt?: number
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <li>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {item.folio} · {item.description}
        {savedAt ? (
          <span className="text-muted-foreground">
            Guardado {formatDateTime(new Date(savedAt).toISOString())}
          </span>
        ) : null}
      </label>
    </li>
  )
}

function OfflineSessionExpiry({ userId }: { userId: string }) {
  const expiresAt = offlineSessionExpiresAt(userId)
  if (!expiresAt)
    return (
      <p className="text-sm text-muted-foreground">
        Valida tu sesión con conexión antes de salir.
      </p>
    )
  return (
    <p className="text-sm text-muted-foreground">
      Sesión sin conexión disponible hasta{' '}
      {formatDateTime(new Date(expiresAt).toISOString())}
    </p>
  )
}

export function OfflineWork({ items, userId }: OfflineWorkProps) {
  const ready = useLiveQuery(
    () =>
      readyTicketDetails(
        userId,
        Date.now(),
        fieldWorkCatalogOptions().map(({ queryKey }) => queryKey),
      ),
    [userId],
  )
  const [onlyReady, setOnlyReady] = useState(false)
  const visible = onlyReady
    ? items.filter((item) => ready?.has(item.id))
    : items

  return (
    <>
      <OfflineSessionExpiry userId={userId} />
      <TicketPicker items={items} userId={userId} ready={ready} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyReady}
          onChange={(event) => setOnlyReady(event.currentTarget.checked)}
        />
        Mostrar solo disponibles sin conexión
      </label>
      {visible.length > 0 ? (
        <>
          <TicketStatusSummary items={visible} />
          <TicketList items={visible} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aún no hay tiquets disponibles sin conexión.
        </p>
      )}
    </>
  )
}
