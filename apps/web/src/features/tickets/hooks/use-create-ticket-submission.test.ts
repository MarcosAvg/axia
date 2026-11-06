import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { UseFormReturn } from 'react-hook-form'

import { ticketMessages } from '../i18n'
import type { CreateTicketInput } from '../schemas'
import { useCreateTicketSubmission } from './use-create-ticket-submission'

const createMutate = vi.fn()
const uploadMutate = vi.fn()
const checkMutate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('../api/offline-evidence', () => ({
  saveAndUploadEvidence: vi.fn(),
}))
vi.mock('./use-tickets', () => ({
  useCreateTicket: () => ({
    mutate: createMutate,
    isPending: false,
    error: null,
  }),
  useCheckDuplicates: () => ({
    mutateAsync: checkMutate,
    isPending: false,
  }),
}))
vi.mock('./use-attachments', () => ({
  useUploadAttachment: () => ({
    mutateAsync: uploadMutate,
  }),
}))

const values: CreateTicketInput = {
  buildingId: 'building-1',
  locationId: 'location-1',
  dependencyId: 'dependency-1',
  categoryId: 'category-1',
  subcategoryId: 'subcategory-1',
  problemId: 'problem-1',
  channelId: 'channel-1',
  description: 'Falla de prueba',
  requesterId: 'requester-1',
}

function fakeForm(): UseFormReturn<CreateTicketInput> {
  return {
    handleSubmit: (handler: (data: CreateTicketInput) => unknown) => async () =>
      handler(values),
  } as unknown as UseFormReturn<CreateTicketInput>
}

describe('alta con adjunto obligatorio', () => {
  it('no crea el tiquet si falta el archivo requerido', async () => {
    checkMutate.mockResolvedValue([])
    const { result } = renderHook(() =>
      useCreateTicketSubmission(fakeForm(), null, null, ['application/pdf']),
    )
    await act(async () => {
      await result.current.onSubmit()
    })
    await waitFor(() =>
      expect(result.current.submitError).toBe(
        ticketMessages.create.attachmentRequired,
      ),
    )
    expect(uploadMutate).not.toHaveBeenCalled()
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('sube el adjunto y lo envía en el alta', async () => {
    checkMutate.mockResolvedValue([])
    uploadMutate.mockResolvedValue('attachment-1')
    const file = new File(['%PDF-1.4'], 'cotizacion.pdf', {
      type: 'application/pdf',
    })
    const { result } = renderHook(() =>
      useCreateTicketSubmission(fakeForm(), null, file, ['application/pdf']),
    )
    await act(async () => {
      await result.current.onSubmit()
    })
    expect(uploadMutate).toHaveBeenCalledWith(
      expect.objectContaining({ problemId: 'problem-1', file }),
    )
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: 'attachment-1' }),
      expect.anything(),
    )
  })

  it('no crea el tiquet si falla la subida', async () => {
    checkMutate.mockResolvedValue([])
    uploadMutate.mockRejectedValue(new Error('red'))
    const file = new File(['%PDF-1.4'], 'cotizacion.pdf', {
      type: 'application/pdf',
    })
    const { result } = renderHook(() =>
      useCreateTicketSubmission(fakeForm(), null, file, ['application/pdf']),
    )
    await act(async () => {
      await result.current.onSubmit()
    })
    await waitFor(() =>
      expect(result.current.submitError).toBe(
        ticketMessages.create.attachmentError,
      ),
    )
    expect(createMutate).not.toHaveBeenCalled()
  })
})
