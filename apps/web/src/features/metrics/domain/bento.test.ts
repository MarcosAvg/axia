import { describe, expect, it } from 'vitest'
import { rowSpanForHeight } from './bento'

describe('rowSpanForHeight', () => {
  it('ocupa al menos una fila', () => {
    expect(rowSpanForHeight(0)).toBe(1)
    expect(rowSpanForHeight(-10)).toBe(1)
    expect(rowSpanForHeight(8)).toBe(1)
  })

  it('crece según el alto real del contenido', () => {
    expect(rowSpanForHeight(24)).toBe(2)
    expect(rowSpanForHeight(40)).toBe(3)
    expect(rowSpanForHeight(100)).toBe(5)
  })
})
