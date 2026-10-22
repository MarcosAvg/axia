import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchChanges } from '../api/notifications-api'

interface TicketEventPayload {
  eventId?: number
  ticketId?: string
  type?: string
}

/** Mantiene la app al día con los eventos de tiquets sin recargar. */
export function useServerEvents() {
  const queryClient = useQueryClient()
  const lastEventId = useRef(0)
  const invalidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const invalidate = useCallback(() => {
    if (invalidationTimer.current) return
    invalidationTimer.current = setTimeout(() => {
      invalidationTimer.current = null
      for (const queryKey of [
        ['notifications'],
        ['tickets'],
        ['dashboard'],
        ['metrics'],
      ]) {
        void queryClient.invalidateQueries({ queryKey })
      }
    }, 150)
  }, [queryClient])

  useEffect(() => {
    if (typeof EventSource === 'undefined') return

    const source = new EventSource('/api/events')

    async function catchUp() {
      if (lastEventId.current <= 0) return
      try {
        const items = await fetchChanges(lastEventId.current)
        if (items.length === 0) return
        lastEventId.current = items[items.length - 1]?.id ?? lastEventId.current
        invalidate()
      } catch {
        // La siguiente reconexión o el foco de la ventana lo reintentará.
      }
    }

    function onTicket(event: MessageEvent<string>) {
      try {
        const payload = JSON.parse(event.data) as TicketEventPayload
        const id = Number(event.lastEventId) || payload.eventId || 0
        if (id > 0) lastEventId.current = id
      } catch {
        // Un evento malformado no debe detener el stream.
      }
      invalidate()
    }

    const onVisible = () => void catchUp()
    const onOnline = () => void catchUp()

    source.addEventListener('ticket', onTicket)
    source.addEventListener('open', () => void catchUp())
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      source.close()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      if (invalidationTimer.current) {
        clearTimeout(invalidationTimer.current)
        invalidationTimer.current = null
      }
    }
  }, [invalidate])
}
