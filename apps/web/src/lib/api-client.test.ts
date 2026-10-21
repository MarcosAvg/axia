import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiFetch } from './api-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('sends credentials and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiFetch<{ ok: boolean }>('/api/test')

    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/test')
    expect(init.credentials).toBe('include')
  })

  it('sets JSON content type for a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/test', {
      method: 'POST',
      body: JSON.stringify({ value: 1 }),
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(init.headers).get('content-type')).toBe(
      'application/json',
    )
  })

  it('maps the API error envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: { code: 'forbidden', message: 'No tienes permiso' },
        requestId: 'req-1',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'forbidden',
      message: 'No tienes permiso',
      requestId: 'req-1',
    } satisfies Partial<ApiError>)
  })
})
