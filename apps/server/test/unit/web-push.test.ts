import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto'
import { expect, it } from 'vitest'

import { createVapid, pushEndpoint } from '../../src/realtime/web-push.js'

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
