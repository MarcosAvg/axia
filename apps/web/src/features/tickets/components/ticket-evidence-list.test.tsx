import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TicketEvidenceItem } from '../domain/types'
import { TicketEvidenceList } from './ticket-evidence-list'

vi.mock('../hooks/use-evidence', () => ({
  useEvidenceUrl: () => ({ data: null }),
}))

function item(overrides: Partial<TicketEvidenceItem> = {}): TicketEvidenceItem {
  return {
    id: 'evidence-1',
    cycle: 1,
    type: 'before',
    storagePath: null,
    mimeType: null,
    sizeBytes: null,
    occurredAt: '2026-11-10T10:00:00.000Z',
    timeConfidence: 'trusted',
    ...overrides,
  }
}

describe('TicketEvidenceList', () => {
  it('marca la evidencia con hora no verificada', () => {
    render(
      <TicketEvidenceList items={[item({ timeConfidence: 'unverified' })]} />,
    )
    expect(screen.getByText('Hora sin verificar')).toBeInTheDocument()
  })

  it('no marca la evidencia con hora confiable', () => {
    render(<TicketEvidenceList items={[item()]} />)
    expect(screen.queryByText('Hora sin verificar')).not.toBeInTheDocument()
  })
})
