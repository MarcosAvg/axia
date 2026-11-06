import { describe, expect, it } from 'vitest'

import { needsRecaptureAttachment } from './recapture-attachment'

describe('adjunto en la recaptura', () => {
  it('no exige archivo si el problema no cambia', () => {
    expect(
      needsRecaptureAttachment({
        problemChanged: false,
        requiredTypes: ['application/pdf'],
        attachedTypes: [],
      }),
    ).toBe(false)
  })

  it('no exige archivo si el problema destino no tiene regla', () => {
    expect(
      needsRecaptureAttachment({
        problemChanged: true,
        requiredTypes: [],
        attachedTypes: [],
      }),
    ).toBe(false)
  })

  it('exige archivo cuando cambia a un problema con regla y no hay compatible', () => {
    expect(
      needsRecaptureAttachment({
        problemChanged: true,
        requiredTypes: ['application/pdf'],
        attachedTypes: ['image/png'],
      }),
    ).toBe(true)
  })

  it('reutiliza un adjunto compatible ya ligado', () => {
    expect(
      needsRecaptureAttachment({
        problemChanged: true,
        requiredTypes: ['application/pdf'],
        attachedTypes: ['application/pdf'],
      }),
    ).toBe(false)
  })
})
