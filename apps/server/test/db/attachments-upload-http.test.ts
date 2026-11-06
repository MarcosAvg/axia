import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  attachmentIdOf,
  attachmentState,
  buildAttachmentHttpApp,
  closeAttachmentHttpApp,
  docx,
  pdf,
  reserve,
  setProblemTypes,
  uploadAttachment,
  xlsx,
  type AttachmentHttpContext,
} from './attachments-http-helpers.js'

let app: AttachmentHttpContext

beforeAll(async () => {
  app = await buildAttachmentHttpApp()
}, 60_000)

afterAll(async () => {
  await closeAttachmentHttpApp(app)
})

describe('subida y verificación de adjuntos', () => {
  it('sube un PDF, verifica el contenido y lo deja listo', async () => {
    const created = await reserve(app.context, app.context.cookies.requester)
    const attachmentId = attachmentIdOf(created)
    const { post, patch } = await uploadAttachment(
      app.baseUrl,
      attachmentId,
      pdf(),
      app.context.cookies.requester,
    )
    expect(post.status).toBe(201)
    expect(patch?.status).toBe(204)
    const state = await attachmentState(app.context, attachmentId)
    expect(state).toMatchObject({
      processing_state: 'ready',
      mime_type: 'application/pdf',
    })
    expect(state?.storage_path).toMatch(/\.pdf$/)
    expect(state?.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rechaza un archivo cuyo contenido no corresponde al tipo declarado', async () => {
    const created = await reserve(app.context, app.context.cookies.requester)
    const attachmentId = attachmentIdOf(created)
    await uploadAttachment(
      app.baseUrl,
      attachmentId,
      Buffer.from('<html><script>alert(1)</script></html>'),
      app.context.cookies.requester,
    )
    expect(await attachmentState(app.context, attachmentId)).toMatchObject({
      processing_state: 'failed',
      storage_path: null,
    })
  })
})

describe('contenedores OOXML', () => {
  it('acepta DOCX y XLSX con contenedor OOXML', async () => {
    await setProblemTypes(app.context, [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ])
    try {
      for (const [file, mime, extension] of [
        [
          docx(),
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'docx',
        ],
        [
          xlsx(),
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'xlsx',
        ],
      ] as const) {
        const created = await reserve(
          app.context,
          app.context.cookies.requester,
          {
            declaredMimeType: mime,
            fileName: `documento.${extension}`,
          },
        )
        const attachmentId = attachmentIdOf(created)
        await uploadAttachment(
          app.baseUrl,
          attachmentId,
          file,
          app.context.cookies.requester,
        )
        const state = await attachmentState(app.context, attachmentId)
        expect(state).toMatchObject({
          processing_state: 'ready',
          mime_type: mime,
        })
        expect(state?.storage_path).toMatch(new RegExp(`\\.${extension}$`))
      }
    } finally {
      await setProblemTypes(app.context, ['application/pdf'])
    }
  })
})

describe('propiedad de la subida', () => {
  it('no permite subir a la fila de otra persona', async () => {
    const created = await reserve(app.context, app.context.cookies.requester)
    const attachmentId = attachmentIdOf(created)
    const { post } = await uploadAttachment(
      app.baseUrl,
      attachmentId,
      pdf(),
      app.context.cookies.technician,
    )
    expect(post.status).toBe(404)
  })

  it('no permite volver a subir un adjunto ya procesado', async () => {
    const created = await reserve(app.context, app.context.cookies.requester)
    const attachmentId = attachmentIdOf(created)
    await uploadAttachment(
      app.baseUrl,
      attachmentId,
      pdf(),
      app.context.cookies.requester,
    )
    const again = await uploadAttachment(
      app.baseUrl,
      attachmentId,
      pdf(),
      app.context.cookies.requester,
    )
    expect(again.post.status).toBeGreaterThanOrEqual(400)
  })
})
