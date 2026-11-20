// Se ejecuta dentro de la imagen con una instancia desechable.
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import sharp from 'sharp'

const base =
  process.env.AXIA_SMOKE_TLS === '1' ? 'https://edge' : 'http://127.0.0.1:3100'
const credentials = {
  username: 'upgrade.admin',
  password: 'UpgradeSmokePassword123!',
}
const description = 'Tiquet de prueba de actualización'
let cookie

async function request(
  path,
  { json, method = json ? 'POST' : 'GET', headers, body } = {},
) {
  const url = new URL(path, base)
  assert.equal(url.origin, base)
  const response = await fetch(url, {
    method,
    headers: {
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : body,
    signal: AbortSignal.timeout(10000),
  })
  assert.ok(response.ok, `${method} ${url.pathname}: HTTP ${response.status}`)
  return response
}

async function catalog(table, values) {
  const response = await request(`/api/admin/catalogs/${table}`, {
    json: values,
  })
  const { id } = await response.json()
  assert.ok(id)
  return id
}

async function fileHash(path) {
  const response = await request(path)
  return createHash('sha256')
    .update(Buffer.from(await response.arrayBuffer()))
    .digest('hex')
}

async function uploadFile(path, values, file) {
  const metadata = Object.entries(values)
    .map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`)
    .join(',')
  const upload = await request(path, {
    method: 'POST',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(file.length),
      'Upload-Metadata': metadata,
    },
  })
  const location = upload.headers.get('location')
  assert.ok(location, 'Falta la ubicación TUS')
  await request(location, {
    method: 'PATCH',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
      'Content-Type': 'application/offset+octet-stream',
    },
    body: file,
  })
}

async function createFixture() {
  await request('/api/setup', {
    json: { ...credentials, fullName: 'Administración de prueba' },
  })
  await login()
  const buildingId = await catalog('buildings', { name: 'Edificio de prueba' })
  const locationId = await catalog('locations', {
    name: 'Taller',
    building_id: buildingId,
  })
  const dependencyId = await catalog('dependencies', {
    name: 'Dependencia de prueba',
    active: true,
    locationIds: [locationId],
  })
  const requesterId = await catalog('requesters', {
    full_name: 'Solicitante de prueba',
    dependency_id: dependencyId,
  })
  const teamId = await catalog('teams', { name: 'Mantenimiento de prueba' })
  const categoryId = await catalog('categories', { name: 'Instalaciones' })
  const subcategoryId = await catalog('subcategories', {
    name: 'Iluminación',
    category_id: categoryId,
  })
  const problemId = await catalog('problems', {
    name: 'Lámpara apagada',
    subcategory_id: subcategoryId,
    team_id: teamId,
    attachment_required_types: ['application/pdf'],
  })
  const pdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n',
  )
  const attachmentResponse = await request('/api/attachments', {
    json: {
      clientRequestId: randomUUID(),
      problemId,
      fileName: 'test.pdf',
      declaredMimeType: 'application/pdf',
      sizeBytes: pdf.length,
    },
  })
  const reservedAttachment = await attachmentResponse.json()
  const attachmentId = reservedAttachment.attachment.id
  await uploadFile(reservedAttachment.uploadUrl, { attachmentId }, pdf)
  const response = await request('/api/tickets', {
    json: {
      buildingId,
      locationId,
      dependencyId,
      requesterId,
      categoryId,
      subcategoryId,
      problemId,
      attachmentId,
      description,
      clientRequestId: randomUUID(),
    },
  })
  const { ticket } = await response.json()
  const image = await sharp({
    create: { width: 40, height: 20, channels: 3, background: '#17558b' },
  })
    .png()
    .toBuffer()
  const reserved = await request(`/api/tickets/${ticket.id}/evidence`, {
    json: {
      type: 'request',
      clientRequestId: randomUUID(),
      mimeType: 'image/png',
      sizeBytes: image.length,
    },
  })
  const { evidence, uploadUrl } = await reserved.json()
  await uploadFile(
    uploadUrl,
    {
      evidenceId: evidence.id,
      ticketId: ticket.id,
    },
    image,
  )
  console.log(
    JSON.stringify({
      ticketId: ticket.id,
      evidenceId: evidence.id,
      sha256: await fileHash(`/api/evidence/${evidence.id}/file`),
      attachmentId,
      attachmentHash: createHash('sha256').update(pdf).digest('hex'),
    }),
  )
}

async function login() {
  const response = await request('/api/auth/login', { json: credentials })
  cookie = response.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie, 'Falta la cookie de sesión')
}

const [mode, fixture] = process.argv.slice(2)
if (mode === 'create') {
  await createFixture()
} else {
  assert.equal(mode, 'check')
  const { ticketId, evidenceId, sha256, attachmentId, attachmentHash } =
    JSON.parse(fixture)
  await login()
  const result = await request(`/api/tickets/${ticketId}`)
  const { ticket } = await result.json()
  assert.equal(ticket.description, description)
  assert.equal(await fileHash(`/api/evidence/${evidenceId}/file`), sha256)
  assert.equal(
    await fileHash(`/api/attachments/${attachmentId}/file`),
    attachmentHash,
  )
  const stream = await request('/api/events')
  assert.match(stream.headers.get('content-type'), /^text\/event-stream/)
  const reader = stream.body.getReader()
  try {
    const { value } = await reader.read()
    assert.match(Buffer.from(value).toString(), /retry:/)
  } finally {
    await reader.cancel()
  }
  console.log('Login, tiquet, evidencia, adjunto y SSE verificados.')
}
