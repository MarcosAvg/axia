import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { readyTicketDetails } from '@/app/query-persister'
import { Button } from '@/components/ui/button'
import { offlineSessionExpiresAt } from '@/features/auth'
import { fieldWorkCatalogOptions } from '@/features/catalogs'
import {
  recoverRejectedEvidence,
  ticketDetailOptions,
  TicketList,
  TicketStatusSummary,
} from '@/features/tickets'
import type { TicketListItem } from '@/features/tickets'
import { formatDateTime } from '@/lib/format'
import { currentOfflineUserId } from '@/lib/offline/user'
import { useOnline } from '@/lib/use-online'

const MAX_TICKETS = 20
const MAX_DETAIL_BYTES = 256 * 1024
const catalogOptions = fieldWorkCatalogOptions()
const catalogKeys = catalogOptions.map(({ queryKey }) => queryKey)

function fitsBudget(detail: unknown) {
  return new Blob([JSON.stringify(detail)]).size <= MAX_DETAIL_BYTES
}

async function prepareWork(
  client: QueryClient,
  userId: string,
  ids: Set<string>,
  { active, onStart }: { active: () => boolean; onStart: () => void },
) {
  const ready = await readyTicketDetails(userId, Date.now(), catalogKeys)
  if (!active()) return
  onStart()
  const managedKey = ['tickets', 'offline-work', userId] as const
  const previous = new Set(client.getQueryData<string[]>(managedKey))
  const retained = new Set(ids)
  client.removeQueries({
    queryKey: ['tickets', 'detail'],
    predicate: (query) => {
      const id = String(query.queryKey[2])
      if (!previous.has(id) || ids.has(id)) return false
      if (!query.getObserversCount()) return true
      retained.add(id)
      return false
    },
  })
  client.setQueryData(managedKey, [...retained])
  if ([...ids].every((id) => ready.has(id))) return

  await Promise.all(
    catalogOptions.map((options) =>
      client.fetchQuery<unknown>({ ...options, retry: false }),
    ),
  )
  for (const id of ids) {
    if (!active()) return
    if (ready.has(id)) continue
    const options = ticketDetailOptions(id)
    try {
      await client.fetchQuery({
        ...options,
        retry: false,
        queryFn: async (context) => {
          const detail = await options.queryFn(context)
          if (currentOfflineUserId() !== userId || !fitsBudget(detail))
            throw new Error('Copia local no disponible')
          return detail
        },
      })
    } catch {
      // El indicador se deriva de la copia persistida y permite reintentar.
    }
  }
}

interface OfflineWorkProps {
  items: TicketListItem[]
  userId: string
  confirmed: boolean
}

function useWorkPreparation({ items, userId, confirmed }: OfflineWorkProps) {
  const client = useQueryClient()
  const online = useOnline()
  const restoring = useIsRestoring()
  const [retry, setRetry] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const roster = JSON.stringify(items.map(({ id }) => id))

  useEffect(() => {
    if (!online || restoring || !confirmed) return
    let cancelled = false
    const active = () => !cancelled && currentOfflineUserId() === userId
    const ids = JSON.parse(roster) as string[]
    void prepareWork(client, userId, new Set(ids.slice(0, MAX_TICKETS)), {
      active,
      onStart: () => setPreparing(true),
    })
      .catch(() => undefined)
      .finally(() => {
        if (active()) {
          setPreparing(false)
          void recoverRejectedEvidence(userId, new Set(ids)).catch(
            () => undefined,
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [client, confirmed, online, restoring, retry, roster, userId])

  return {
    online,
    preparing: online && preparing,
    retry: () => setRetry((value) => value + 1),
  }
}

function useAvailability(userId: string) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const ready = useLiveQuery(
    () => readyTicketDetails(userId, now, catalogKeys),
    [userId, now],
  )
  return { now, ready }
}

function WorkAvailability({
  eligibleCount,
  readyCount,
  expiresAt,
  work,
}: {
  eligibleCount: number
  readyCount: number
  expiresAt: number | undefined
  work: ReturnType<typeof useWorkPreparation>
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {expiresAt
          ? `Sesión sin conexión disponible hasta ${formatDateTime(new Date(expiresAt).toISOString())}`
          : 'Valida tu sesión con conexión antes de salir.'}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p role="status">
          {readyCount} de {eligibleCount} tiquets disponibles sin conexión.
          {work.preparing ? ' Preparando tiquets…' : null}
        </p>
        {work.online && !work.preparing && readyCount < eligibleCount ? (
          <Button variant="outline" size="sm" onClick={work.retry}>
            Reintentar
          </Button>
        ) : null}
      </div>
    </>
  )
}

export function OfflineWork(props: OfflineWorkProps) {
  const { items, userId } = props
  const work = useWorkPreparation(props)
  const [onlyReady, setOnlyReady] = useState(false)
  const { now, ready } = useAvailability(userId)
  const expiresAt = offlineSessionExpiresAt(userId)
  const eligible = items.slice(0, MAX_TICKETS)
  const readyIds = new Set(
    expiresAt && expiresAt > now
      ? eligible.filter(({ id }) => ready?.has(id)).map(({ id }) => id)
      : [],
  )
  const visible = onlyReady ? items.filter(({ id }) => readyIds.has(id)) : items
  return (
    <>
      {items.length > 0 ? (
        <>
          <WorkAvailability
            eligibleCount={eligible.length}
            readyCount={readyIds.size}
            expiresAt={expiresAt && expiresAt > now ? expiresAt : undefined}
            work={work}
          />
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
              <TicketList items={visible} offlineReadyIds={readyIds} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay tiquets disponibles sin conexión.
            </p>
          )}
        </>
      ) : null}
    </>
  )
}
