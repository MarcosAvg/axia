import { AsyncLocalStorage } from 'node:async_hooks'

export type TimeConfidence = 'trusted' | 'unverified' | 'corrected'

export type ActionContext = {
  occurredAt: string | null
  clientReportedAt: string | null
  timeConfidence: TimeConfidence
  clientClockSkewMs: number | null
}

const DEFAULT_CONTEXT: ActionContext = {
  occurredAt: null,
  clientReportedAt: null,
  timeConfidence: 'trusted',
  clientClockSkewMs: null,
}

const storage = new AsyncLocalStorage<ActionContext>()

export function withActionContext<T>(
  context: ActionContext,
  callback: () => Promise<T>,
): Promise<T> {
  return storage.run(context, callback)
}

export function withOccurredAt<T>(
  occurredAt: string,
  callback: () => Promise<T>,
): Promise<T> {
  return withActionContext(
    { ...DEFAULT_CONTEXT, occurredAt, timeConfidence: 'corrected' },
    callback,
  )
}

export function currentActionContext(): ActionContext | null {
  return storage.getStore() ?? null
}

export function currentOccurredAt(): string | null {
  return storage.getStore()?.occurredAt ?? null
}
