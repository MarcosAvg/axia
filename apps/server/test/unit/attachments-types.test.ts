import { describe, expect, it } from 'vitest'

import {
  ATTACHMENT_MIME_TYPES,
  attachmentExtension,
  isAttachmentMimeType,
} from '../../src/attachments/types.js'

describe('tipos de adjunto', () => {
  it('reconoce solo los MIME permitidos', () => {
    expect(isAttachmentMimeType('application/pdf')).toBe(true)
    expect(isAttachmentMimeType('text/html')).toBe(false)
    expect(isAttachmentMimeType('image/svg+xml')).toBe(false)
  })

  it('devuelve una extensión segura por tipo', () => {
    expect(attachmentExtension('application/pdf')).toBe('pdf')
    expect(
      attachmentExtension(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx')
    expect(ATTACHMENT_MIME_TYPES).toHaveLength(6)
  })
})
