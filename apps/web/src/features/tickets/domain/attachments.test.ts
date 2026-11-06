import { describe, expect, it } from 'vitest'

import type { ProblemOption } from '@/features/catalogs'
import {
  acceptFor,
  attachmentTypeLabel,
  requiredTypesForProblem,
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
})
