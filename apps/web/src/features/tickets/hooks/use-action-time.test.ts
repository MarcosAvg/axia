import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useActionTime } from './use-action-time'

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    identity: { timezone: 'America/Mexico_City' },
  }),
  can: () => true,
}))

describe('useActionTime', () => {
  it('no propone la hora del dispositivo y devuelve hora de pared', () => {
    const { result } = renderHook(() => useActionTime(true))
    expect(result.current.value).toBe('')
    expect(result.current.local).toBeUndefined()

    act(() => result.current.setValue('2026-11-10T14:30'))
    expect(result.current.local).toBe('2026-11-10T14:30')
    expect(result.current.timezone).toBe('America/Mexico_City')
  })
})
