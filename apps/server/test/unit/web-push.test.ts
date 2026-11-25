import {
  createDecipheriv,
  createECDH,
  createPublicKey,
  generateKeyPairSync,
  hkdfSync,
  verify,
} from 'node:crypto'
import { expect, it, vi } from 'vitest'

import {
  createVapid,
  pushEndpoint,
  sendWebPush,
} from '../../src/realtime/web-push.js'

it('restricts outbound requests to HTTPS push providers', () => {
  expect(
    pushEndpoint('https://fcm.googleapis.com/fcm/send/token'),
  ).not.toBeNull()
  expect(pushEndpoint('https://region.push.apple.com/token')).not.toBeNull()
  expect(pushEndpoint('https://wns2.notify.windows.com/token')).not.toBeNull()
  expect(pushEndpoint('https://fcm.googleapis.com@127.0.0.1/token')).toBeNull()
  expect(pushEndpoint('https://fcm.googleapis.com:8443/token')).toBeNull()
  expect(pushEndpoint('https://web.push.apple.com.evil.test/token')).toBeNull()
})

it('signs a VAPID token for the push endpoint origin', () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const vapid = createVapid(
    privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
    'mailto:axia@example.com',
  )
  const authorization = vapid.authorization('https://web.push.apple.com')
  const token = authorization.split(',')[0]?.replace('vapid t=', '') ?? ''
  const [header, claims, signature] = token.split('.')
  expect(
    JSON.parse(Buffer.from(claims!, 'base64url').toString()),
  ).toMatchObject({
    aud: 'https://web.push.apple.com',
    sub: 'mailto:axia@example.com',
  })
  expect(
    verify(
      'sha256',
      Buffer.from(`${header}.${claims}`),
      { key: createPublicKey(privateKey), dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature!, 'base64url'),
    ),
  ).toBe(true)
  expect(authorization.endsWith(`, k=${vapid.publicKey}`)).toBe(true)
})

// RFC 8291. Decode the wire record as a subscribing browser would.
function decryptPush(
  body: Buffer,
  receiver: ReturnType<typeof createECDH>,
  auth: Buffer,
) {
  const keyLength = body.readUInt8(20)
  const senderKey = body.subarray(21, 21 + keyLength)
  const salt = body.subarray(0, 16)
  const record = body.subarray(21 + keyLength)
  const info = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    receiver.getPublicKey(),
    senderKey,
  ])
  const inputKey = hkdfSync(
    'sha256',
    receiver.computeSecret(senderKey),
    auth,
    info,
    32,
  )
  const contentKey = hkdfSync(
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
  const cipher = createDecipheriv(
    'aes-128-gcm',
    Buffer.from(contentKey),
    Buffer.from(nonce),
  )
  cipher.setAuthTag(record.subarray(-16))
  const plaintext = Buffer.concat([
    cipher.update(record.subarray(0, -16)),
    cipher.final(),
  ])
  expect(plaintext.at(-1)).toBe(2)
  return JSON.parse(plaintext.subarray(0, -1).toString('utf8'))
}

it('sends an encrypted record with only the notice ID and event type', async () => {
  const receiver = createECDH('prime256v1')
  const p256dh = receiver.generateKeys().toString('base64url')
  const auth = Buffer.alloc(16, 42)
  const endpoint = 'https://fcm.googleapis.com/fcm/send/token'
  const notice = {
    id: '4a51f3ff-c64a-49e0-8cd4-03fb50223351',
    type: 'assigned_technician',
  }
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () => new Response(null, { status: 201 }),
  )
  vi.stubGlobal('fetch', fetch)
  try {
    const vapid = { publicKey: 'test', authorization: () => 'test' }
    await expect(
      sendWebPush(
        vapid,
        { endpoint, p256dh, auth: auth.toString('base64url') },
        notice,
      ),
    ).resolves.toBe(201)
    const request = fetch.mock.calls[0]?.[1]
    expect(new Headers(request?.headers).get('Content-Encoding')).toBe(
      'aes128gcm',
    )
    expect(Buffer.isBuffer(request?.body)).toBe(true)
    expect(
      decryptPush(request?.body as unknown as Buffer, receiver, auth),
    ).toEqual(notice)
  } finally {
    vi.unstubAllGlobals()
  }
})
