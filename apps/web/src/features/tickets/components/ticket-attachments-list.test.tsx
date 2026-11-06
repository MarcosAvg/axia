import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { TicketAttachment } from '../domain/types'
import { ticketMessages } from '../i18n'
import { TicketAttachmentsList } from './ticket-attachments-list'

const attachment: TicketAttachment = {
  id: 'attachment-1',
  fileName: 'cotizacion.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  uploadedByName: 'Ana Pérez',
  createdAt: '2026-11-06T10:00:00.000Z',
}

describe('TicketAttachmentsList', () => {
  it('muestra nombre, tipo, tamaño y descarga sin vista previa', () => {
    const { container } = render(<TicketAttachmentsList items={[attachment]} />)
    expect(screen.getByText('cotizacion.pdf')).toBeTruthy()
    expect(screen.getByText(/PDF/)).toBeTruthy()
    expect(screen.getByText(/2 KB/)).toBeTruthy()
    const link = screen.getByRole('link', {
      name: new RegExp(ticketMessages.detail.download, 'i'),
    })
    expect(link.getAttribute('href')).toBe('/api/attachments/attachment-1/file')
    expect(container.querySelector('img')).toBeNull()
  })

  it('muestra el vacío cuando no hay adjuntos', () => {
    render(<TicketAttachmentsList items={[]} />)
    expect(screen.getByText(ticketMessages.detail.noAttachments)).toBeTruthy()
  })
})
