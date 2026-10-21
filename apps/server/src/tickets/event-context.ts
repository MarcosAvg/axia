import { AsyncLocalStorage } from 'node:async_hooks'

type EventContext = {
  occurredAt: string
}

const storage = new AsyncLocalStorage<EventContext>()

export function withOccurredAt<T>(
  occurredAt: string,
  callback: () => Promise<T>,
): Promise<T> {
  return storage.run({ occurredAt }, callback)
}

export function currentOccurredAt(): string | null {
  return storage.getStore()?.occurredAt ?? null
}
