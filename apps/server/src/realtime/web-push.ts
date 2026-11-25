import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  randomBytes,
  sign,
} from 'node:crypto'

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

type Subscription = {
  endpoint: string
  p256dh: string
  auth: string
}

type PushNotice = { id: string; type: string }

function encryptNotice(subscription: Subscription, notice: PushNotice) {
  const recipient = Buffer.from(subscription.p256dh, 'base64url')
  const auth = Buffer.from(subscription.auth, 'base64url')
  const sender = createECDH('prime256v1')
  const senderKey = sender.generateKeys()
  const salt = randomBytes(16)

  // RFC 8291 over RFC 8188: ephemeral P-256 key and one final aes128gcm record.
  const secret = sender.computeSecret(recipient)
  const info = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    recipient,
    senderKey,
  ])
  const inputKey = hkdfSync('sha256', secret, auth, info, 32)
  const key = hkdfSync(
    'sha256',
    Buffer.from(inputKey),
    salt,
    'Content-Encoding: aes128gcm\0',
    16,
  )
  const nonce = hkdfSync(
    'sha256',
    Buffer.from(inputKey),
    salt,
    'Content-Encoding: nonce\0',
    12,
  )
  const cipher = createCipheriv(
    'aes-128-gcm',
    Buffer.from(key),
    Buffer.from(nonce),
  )

  const header = Buffer.alloc(21)
  salt.copy(header)
  header.writeUInt32BE(4096, 16)
  header.writeUInt8(senderKey.length, 20)
  const payload = JSON.stringify({ id: notice.id, type: notice.type })
  const plaintext = Buffer.concat([Buffer.from(payload), Buffer.from([2])])
  return Buffer.concat([
    header,
    senderKey,
    cipher.update(plaintext),
    cipher.final(),
    cipher.getAuthTag(),
  ])
}

export async function sendWebPush(
  vapid: Vapid,
  subscription: Subscription,
  notice: PushNotice,
) {
  const url = pushEndpoint(subscription.endpoint)
  if (!url) return 400

  let body: ReturnType<typeof encryptNotice>
  try {
    body = encryptNotice(subscription, notice)
  } catch {
    return 400
  }

  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(4000),
    headers: {
      Authorization: vapid.authorization(url.origin),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'normal',
    },
    body,
  })
  await response.body?.cancel()
  return response.status
}
