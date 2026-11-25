import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { can, useAuth } from '@/features/auth'
import {
  getPushConfig,
  registerPushSubscription,
} from '../api/notifications-api'

let automaticRequest: Promise<NotificationPermission> | undefined

async function subscribe(
  registration: ServiceWorkerRegistration,
  publicKey: string,
) {
  const existing = await registration.pushManager.getSubscription()
  const key = Uint8Array.from(
    atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')),
    (value) => value.charCodeAt(0),
  )
  if (existing) {
    const existingKey = existing.options.applicationServerKey
    if (
      !existingKey ||
      (existingKey.byteLength === key.byteLength &&
        new Uint8Array(existingKey).every(
          (value, index) => value === key[index],
        ))
    ) {
      return existing
    }
    await existing.unsubscribe()
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  })
}

function isAppleMobileBrowser() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

type Invite = 'permission' | 'install' | null

function needsHomeScreen() {
  return (
    isAppleMobileBrowser() && !matchMedia('(display-mode: standalone)').matches
  )
}

async function requestPermissionOnOpen() {
  if (Notification.permission !== 'default') return
  automaticRequest ??= Notification.requestPermission().catch(() => 'default')
  await automaticRequest
}

function supportsWebPush() {
  return 'Notification' in window && 'PushManager' in window
}

async function initializePush(
  signal: AbortSignal,
  setInvite: (invite: Invite) => void,
) {
  const { publicKey } = await getPushConfig(signal)
  if (!publicKey || signal.aborted) return
  if (needsHomeScreen()) {
    setInvite('install')
    return
  }
  if (!supportsWebPush()) return
  await requestPermissionOnOpen()
  if (signal.aborted) return
  if (Notification.permission !== 'granted') {
    setInvite(Notification.permission === 'default' ? 'permission' : null)
    return
  }

  setInvite(null)
  await syncSubscription(publicKey, signal)
}

function workerHandlesPush(worker: ServiceWorker) {
  return new Promise<boolean>((resolve) => {
    const { port1, port2 } = new MessageChannel()
    const finish = (supported: boolean) => {
      clearTimeout(timer)
      port1.close()
      resolve(supported)
    }
    const timer = setTimeout(() => finish(false), 1500)
    port1.onmessage = (event) => finish(event.data === true)
    try {
      worker.postMessage('AXIA_PUSH_READY', [port2])
    } catch {
      port2.close()
      finish(false)
    }
  })
}

async function syncSubscription(publicKey: string, signal: AbortSignal) {
  const registration = await navigator.serviceWorker.ready
  const worker = registration.active
  if (signal.aborted || !worker || !(await workerHandlesPush(worker))) return
  if (signal.aborted || registration.active !== worker) return
  const subscription = await subscribe(registration, publicKey)
  if (!signal.aborted && registration.active === worker) {
    await registerPushSubscription(subscription, signal)
  }
}

function usePushInvite(eligible: boolean, userId?: string) {
  const [invite, setInvite] = useState<Invite>(null)
  const [dismissed, setDismissed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  )

  useEffect(() => {
    if (
      !eligible ||
      dismissed ||
      !window.isSecureContext ||
      !('serviceWorker' in navigator)
    )
      return
    const workers = navigator.serviceWorker
    const controller = new AbortController()
    const start = () =>
      void initializePush(controller.signal, setInvite).catch(() => {
        // Retry if the network reconnects or Axia opens again.
      })
    start()
    window.addEventListener('online', start)
    workers.addEventListener('controllerchange', start)
    return () => {
      controller.abort()
      window.removeEventListener('online', start)
      workers.removeEventListener('controllerchange', start)
    }
  }, [dismissed, eligible, permission, userId])

  function requestPermission() {
    void Notification.requestPermission()
      .then((result) => {
        setPermission(result)
        if (result !== 'default') setInvite(null)
      })
      .catch(() => setInvite(null))
  }

  return {
    invite: eligible && !dismissed ? invite : null,
    dismiss: () => setDismissed(true),
    requestPermission,
  }
}

export function PushPermission() {
  const { identity, isOfflineSession } = useAuth()
  const eligible = can(identity, 'ticket.view') && !isOfflineSession
  const { invite, dismiss, requestPermission } = usePushInvite(
    eligible,
    identity?.userId,
  )
  if (!invite) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm">
      <p>
        {invite === 'install'
          ? 'Añade Axia a la pantalla de inicio para recibir avisos en este dispositivo.'
          : '¿Quieres recibir avisos de Axia en este dispositivo?'}
      </p>
      <div className="flex gap-2">
        {invite === 'permission' && (
          <Button size="sm" onClick={requestPermission}>
            Permitir avisos
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Ahora no
        </Button>
      </div>
    </div>
  )
}
