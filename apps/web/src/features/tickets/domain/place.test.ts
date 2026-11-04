import { describe, expect, it } from 'vitest'

import type { RequesterOption } from '@/features/catalogs'
import { effectiveRequester } from './place'

function requester(
  id: string,
  dependencyId: string | null,
  dependencyName: string | null,
): RequesterOption {
  return {
    id,
    fullName: id,
    contact: null,
    dependencyId,
    dependencyName,
    userId: null,
  }
}

const own = requester('own', 'dep-own', 'Dependencia propia')
const other = requester('other', 'dep-other', 'Dependencia ajena')
const unassigned = requester('unassigned', null, null)

describe('effectiveRequester', () => {
  it('prioriza el solicitante elegido sobre el propio', () => {
    expect(effectiveRequester([own, other], 'other', 'own')).toBe(other)
  })

  it('usa el solicitante propio cuando no hay selección', () => {
    expect(effectiveRequester([own, other], '', 'own')).toBe(own)
  })

  it('no inventa un solicitante cuando no hay coincidencia', () => {
    expect(effectiveRequester([own, other], '', null)).toBeUndefined()
    expect(effectiveRequester([own], 'missing', null)).toBeUndefined()
  })

  it('deja la dependencia en null si el solicitante no tiene', () => {
    expect(
      effectiveRequester([unassigned], 'unassigned', null)?.dependencyId,
    ).toBeNull()
  })
})
