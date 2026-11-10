import { AsyncLocalStorage } from 'node:async_hooks'

export type TimeConfidence = 'trusted' | 'unverified' | 'corrected'

export type TimeAlertKind = 'clock_skew' | 'clock_unknown'

export type ActionContext = {
  occurredAt: string | null
  clientReportedAt: string | null
  timeConfidence: TimeConfidence
  clientClockSkewMs: number | null
  timeAlertKind: TimeAlertKind | null
  suggestedOccurredAt: string | null
}

const storage = new AsyncLocalStorage<ActionContext>()

export function withActionContext<T>(
  context: ActionContext,
  callback: () => Promise<T>,
): Promise<T> {
  return storage.run(context, callback)
}

export function currentActionContext(): ActionContext | null {
  return storage.getStore() ?? null
}

export function currentOccurredAt(): string | null {
  return storage.getStore()?.occurredAt ?? null
}
