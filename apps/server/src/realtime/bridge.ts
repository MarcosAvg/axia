import { Client } from 'pg'

import type { EventHub, TicketEvent } from './hub.js'

export function createEventBridge(connectionString: string, hub: EventHub) {
  let client: Client | null = null
  let stopped = false
  let reconnectTimer: NodeJS.Timeout | null = null
  let queue: Promise<void> = Promise.resolve()

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, 1_000)
  }

  async function connect(): Promise<void> {
    if (stopped) return
    const next = new Client({
      connectionString,
      application_name: 'axia-events',
    })
    client = next
    next.on('notification', (message) => {
      if (message.channel !== 'axia_events' || !message.payload) return
      try {
        const event = JSON.parse(message.payload) as TicketEvent
        // Serialize fan-outs so events keep their order.
        queue = queue.then(() => hub.publish(event)).catch(() => {})
      } catch {
        // Ignore malformed notifications; the stream will catch up by query.
      }
    })
    next.on('error', () => {
      scheduleReconnect()
    })
    next.on('end', () => {
      scheduleReconnect()
    })

    try {
      await next.connect()
      await next.query('listen axia_events')
    } catch {
      await next.end().catch(() => {})
      scheduleReconnect()
    }
  }

  return {
    start: connect,
    async stop() {
      stopped = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (client) {
        const current = client
        client = null
        await current.end().catch(() => {})
      }
    },
  }
}
