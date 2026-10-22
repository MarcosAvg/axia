type ErrorEnvelope = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
  requestId?: string
}

type ApiErrorInit = {
  status: number
  code: string
  message: string
  details?: unknown
  requestId?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly requestId?: string

  constructor({ status, code, message, details, requestId }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? ''
}

function baseUrl(): string {
  return apiBaseUrl()
}

function notifyUnauthorized(path: string): void {
  if (
    typeof window === 'undefined' ||
    path.startsWith('/api/auth/me') ||
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/setup/status')
  ) {
    return
  }
  window.dispatchEvent(new Event('axia:unauthorized'))
}

async function throwApiError(response: Response, path: string): Promise<never> {
  let envelope: ErrorEnvelope = {}
  try {
    envelope = (await response.json()) as ErrorEnvelope
  } catch {
    // Keep a generic message when the server did not return JSON.
  }
  if (response.status === 401) notifyUnauthorized(path)
  const error = envelope.error
  throw new ApiError({
    status: response.status,
    code: error?.code ?? 'request_error',
    message: error?.message ?? 'La petición no se pudo completar',
    details: error?.details,
    requestId: envelope.requestId,
  })
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (!response.ok) await throwApiError(response, path)
  return parseResponse<T>(response)
}
