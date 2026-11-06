import { describe, expect, it } from 'vitest'

import type { ProblemOption } from '@/features/catalogs'
import {
  acceptFor,
  attachmentTypeLabel,
  requiredTypesForProblem,
  uploadErrorMessage,
} from './attachments'

function problem(overrides: Partial<ProblemOption> = {}): ProblemOption {
  return {
    id: 'problem-1',
    name: 'Falla',
    subcategoryId: 'sub-1',
    requiredAttachmentTypes: [],
    attachmentInstructions: null,
    ...overrides,
  }
}

describe('adjuntos del problema', () => {
  it('no exige adjunto cuando el problema no tiene tipos', () => {
    expect(requiredTypesForProblem(problem())).toEqual([])
    expect(requiredTypesForProblem(undefined)).toEqual([])
  })

  it('devuelve los tipos configurados', () => {
    expect(
      requiredTypesForProblem(
        problem({ requiredAttachmentTypes: ['application/pdf'] }),
      ),
    ).toEqual(['application/pdf'])
  })

  it('construye el accept solo con los tipos pedidos', () => {
    expect(acceptFor(['application/pdf', 'image/png'])).toBe(
      'application/pdf,image/png',
    )
    expect(acceptFor([])).toBe('')
  })

  it('etiqueta los tipos conocidos', () => {
    expect(attachmentTypeLabel('application/pdf')).toBe('PDF')
    expect(attachmentTypeLabel('application/pdf')).not.toBe('application/pdf')
  })

  it('prefiere el mensaje del servidor y de TUS', () => {
    const apiError = new Error('Cuota excedida')
    apiError.name = 'ApiError'
    expect(uploadErrorMessage(apiError)).toBe('Cuota excedida')
    expect(
      uploadErrorMessage({
        originalResponse: { getBody: () => 'El contenido no corresponde' },
      }),
    ).toBe('El contenido no corresponde')
    expect(uploadErrorMessage(new Error('Failed to fetch'))).toBeNull()
    expect(uploadErrorMessage(null)).toBeNull()
  })
})
