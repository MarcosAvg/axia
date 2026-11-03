import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { test } from 'node:test'

import { assertPortsFree, isPortFree } from './dev-ports.mjs'

function listen(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, host, () => {
      resolve({ server, port: server.address().port })
    })
  })
}

test('isPortFree detecta un puerto ocupado y uno libre', async () => {
  const { server, port } = await listen()
  try {
    assert.equal(await isPortFree(port), false)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
  assert.equal(await isPortFree(port), true)
})

test('assertPortsFree nombra el puerto ocupado antes de arrancar', async () => {
  const { server, port } = await listen()
  try {
    await assert.rejects(
      assertPortsFree([{ name: 'API', port }]),
      new RegExp(`Puerto en uso: API \\(127\\.0\\.0\\.1:${port}\\)`),
    )
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
