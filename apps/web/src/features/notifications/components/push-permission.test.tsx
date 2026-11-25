import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  getPushConfig,
  registerPushSubscription,
} from '../api/notifications-api'
import { PushPermission } from './push-permission'

vi.mock('@/features/auth', () => ({
  can: () => true,
  useAuth: () => ({ identity: { userId: 'user' }, isOfflineSession: false }),
}))

vi.mock('../api/notifications-api', () => ({
  getPushConfig: vi.fn(),
  registerPushSubscription: vi.fn(),
}))

const publicKey = 'BA'
const subscription = { endpoint: 'https://web.push.apple.com/example' }
const workers = new EventTarget()
const subscribe = vi.fn(async () => subscription)
const supportingWorker = {
  postMessage: (_message: unknown, [port]: MessagePort[]) =>
    port?.postMessage(true),
}
const registration = {
  active: supportingWorker,
  pushManager: { getSubscription: async () => null, subscribe },
}

beforeEach(() => {
  registration.active = supportingWorker
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('PushManager', function () {})
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal('navigator', {
    userAgent: 'Desktop',
    serviceWorker: Object.assign(workers, {
      ready: Promise.resolve(registration),
    }),
  })
  vi.mocked(getPushConfig).mockResolvedValue({ publicKey })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('tries the native prompt on open and offers a click if the browser requires one', async () => {
  let permission: NotificationPermission = 'default'
  const requestPermission = vi
    .fn()
    .mockResolvedValueOnce('default')
    .mockImplementationOnce(async () => {
      permission = 'granted'
      return permission
    })
  vi.stubGlobal('Notification', {
    get permission() {
      return permission
    },
    requestPermission,
  })

  render(<PushPermission />)

  const allow = await screen.findByRole('button', { name: 'Permitir avisos' })
  expect(requestPermission).toHaveBeenCalledTimes(1)
  expect(registerPushSubscription).not.toHaveBeenCalled()
  fireEvent.click(allow)
  await waitFor(() =>
    expect(registerPushSubscription).toHaveBeenCalledWith(
      subscription,
      expect.any(AbortSignal),
    ),
  )
  expect(requestPermission).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('button', { name: 'Permitir avisos' })).toBeNull()
})

it('registers a device with a previously granted permission on open', async () => {
  const requestPermission = vi.fn()
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission })

  render(<PushPermission />)

  await waitFor(() =>
    expect(registerPushSubscription).toHaveBeenCalledWith(
      subscription,
      expect.any(AbortSignal),
    ),
  )
  expect(requestPermission).not.toHaveBeenCalled()
})

it('waits for the worker that handles push before registering the device', async () => {
  const legacy = { postMessage: vi.fn() }
  registration.active = legacy
  vi.stubGlobal('Notification', { permission: 'granted' })

  render(<PushPermission />)
  await waitFor(() => expect(legacy.postMessage).toHaveBeenCalled())
  expect(subscribe).not.toHaveBeenCalled()
  expect(registerPushSubscription).not.toHaveBeenCalled()

  registration.active = supportingWorker
  workers.dispatchEvent(new Event('controllerchange'))
  await waitFor(() => expect(registerPushSubscription).toHaveBeenCalledOnce())
})
