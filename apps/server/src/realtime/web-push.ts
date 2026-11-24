import { createPrivateKey, createPublicKey, sign } from 'node:crypto'

const providerSuffixes = [
  '.push.services.mozilla.com',
  '.push.apple.com',
  '.notify.windows.com',
]

function isPushProvider(host: string) {
  return (
    host === 'fcm.googleapis.com' ||
    providerSuffixes.some((suffix) => host.endsWith(suffix))
  )
}

export function pushEndpoint(value: string): URL | null {
  const url = URL.parse(value)
  if (
    !url ||
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !isPushProvider(url.hostname)
  )
    return null
  return url
}

export function createVapid(privateKey: string, contact: string) {
  const key = createPrivateKey({
    key: Buffer.from(privateKey, 'base64'),
    format: 'der',
    type: 'pkcs8',
  })
  const { x, y, crv } = createPublicKey(key).export({ format: 'jwk' })
  if (crv !== 'P-256' || !x || !y) {
    throw new Error('Web Push requires a P-256 private key')
  }

  const publicKey = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(x, 'base64url'),
    Buffer.from(y, 'base64url'),
  ]).toString('base64url')
  const header = Buffer.from('{"typ":"JWT","alg":"ES256"}').toString(
    'base64url',
  )

  const authorizations = new Map<string, { refreshAt: number; value: string }>()

  return {
    publicKey,
    authorization(origin: string) {
      const now = Math.floor(Date.now() / 1000)
      const cached = authorizations.get(origin)
      if (cached && now < cached.refreshAt) return cached.value
      const claims = Buffer.from(
        JSON.stringify({
          aud: origin,
          exp: now + 7200,
          sub: contact,
        }),
      ).toString('base64url')
      const token = `${header}.${claims}`
      const signature = sign('sha256', Buffer.from(token), {
        key,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url')
      const value = `vapid t=${token}.${signature}, k=${publicKey}`
      authorizations.set(origin, { refreshAt: now + 3600, value })
      return value
    },
  }
}

export type Vapid = ReturnType<typeof createVapid>

export async function sendWebPush(vapid: Vapid, endpoint: string) {
  const url = pushEndpoint(endpoint)
  if (!url) return 400

  // This wake-up has no payload. The service worker supplies the generic text.
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(4000),
    headers: {
      Authorization: vapid.authorization(url.origin),
      TTL: '3600',
      Urgency: 'normal',
    },
  })
  await response.body?.cancel()
  return response.status
}
