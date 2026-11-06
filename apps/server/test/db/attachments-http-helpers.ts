import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'

import type { AttachmentMimeType } from '../../src/attachments/types.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

export type AttachmentHttpContext = {
  context: TicketHttpContext
  baseUrl: string
}

export async function buildAttachmentHttpApp(): Promise<AttachmentHttpContext> {
  const context = await buildTicketHttpApp()
  const baseUrl = await context.app.listen({ host: '127.0.0.1', port: 0 })
  await setProblemTypes(context, ['application/pdf'])
  return { context, baseUrl }
}

export async function closeAttachmentHttpApp(
  app: AttachmentHttpContext,
): Promise<void> {
  if (app) await closeTicketHttpApp(app.context)
}

export async function setProblemTypes(
  context: TicketHttpContext,
  types: AttachmentMimeType[],
): Promise<void> {
  const array = sql`array[${sql.join(
    types.map((type) => sql`${type}`),
    sql`, `,
  )}]::text[]`
  await context.db.execute(sql`
    update public.problems
    set attachment_required_types = ${array}
    where id = ${context.catalog.problemA.id}
  `)
}

export function reserve(
  context: TicketHttpContext,
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  return context.app.inject({
    method: 'POST',
    url: '/api/attachments',
    headers: authHeaders(cookie),
    payload: {
      clientRequestId: randomUUID(),
      problemId: context.catalog.problemA.id,
      fileName: 'cotizacion.pdf',
      declaredMimeType: 'application/pdf',
      sizeBytes: 1024,
      ...overrides,
    },
  })
}

export function attachmentIdOf(response: { json: () => unknown }): string {
  return (response.json() as { attachment: { id: string } }).attachment.id
}

function metadata(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`)
    .join(',')
}

export async function uploadAttachment(
  baseUrl: string,
  attachmentId: string,
  file: Buffer,
  cookie: string,
) {
  const post = await fetch(`${baseUrl}/api/attachment-uploads`, {
    method: 'POST',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(file.length),
      'Upload-Metadata': metadata({ attachmentId }),
      Cookie: cookie,
      Origin: baseUrl,
    },
  })
  const location = post.headers.get('location')
  if (!location) return { post, patch: null }
  const patch = await fetch(location, {
    method: 'PATCH',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
      'Content-Type': 'application/offset+octet-stream',
      Cookie: cookie,
      Origin: baseUrl,
    },
    body: file,
  })
  return { post, patch }
}

export async function attachmentState(
  context: TicketHttpContext,
  attachmentId: string,
) {
  const row = await context.db.execute(sql`
    select processing_state, mime_type, storage_path, sha256, size_bytes
    from public.ticket_attachments
    where id = ${attachmentId}
  `)
  return row.rows[0] as
    | {
        processing_state: string
        mime_type: string | null
        storage_path: string | null
        sha256: string | null
        size_bytes: string | number | null
      }
    | undefined
}

export function pdf(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let value = 0xffffffff
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

/** ZIP sin compresión con las entradas indicadas, suficiente para OOXML. */
function zipStore(entries: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const crc = crc32(entry.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(entry.data.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, entry.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += local.length + name.length + entry.data.length
  }
  const centralSize = centrals.reduce((total, part) => total + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, ...centrals, end])
}

function contentTypes(part: string, contentType: string): Buffer {
  return Buffer.from(
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${part}" ContentType="${contentType}"/></Types>`,
  )
}

export function docx(): Buffer {
  return zipStore([
    {
      name: '[Content_Types].xml',
      data: contentTypes(
        'word/document.xml',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
      ),
    },
    { name: 'word/document.xml', data: Buffer.from('<document/>') },
  ])
}

export function xlsx(): Buffer {
  return zipStore([
    {
      name: '[Content_Types].xml',
      data: contentTypes(
        'xl/workbook.xml',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
      ),
    },
    { name: 'xl/workbook.xml', data: Buffer.from('<workbook/>') },
  ])
}
