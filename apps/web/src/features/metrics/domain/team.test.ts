import { describe, expect, it } from 'vitest'
import { auxiliaryMinutes, offerRate, technicianParticipation } from './team'

describe('offerRate', () => {
  it('calcula la proporción sobre las ofertas', () => {
    expect(offerRate(6, 10)).toBe(0.6)
    expect(offerRate(0, 0)).toBe(0)
  })
})

describe('technicianParticipation', () => {
  const row = {
    participationMinutes: 100,
    participationLaborMinutes: 60,
  }

  it('elige la participación según el reloj', () => {
    expect(technicianParticipation(row, 'calendar')).toBe(100)
    expect(technicianParticipation(row, 'laboral')).toBe(60)
    expect(technicianParticipation(row, 'extra')).toBe(40)
  })
})

describe('auxiliaryMinutes', () => {
  const row = { minutes: 100, laborMinutes: 60 }

  it('elige el tiempo auxiliar según el reloj', () => {
    expect(auxiliaryMinutes(row, 'calendar')).toBe(100)
    expect(auxiliaryMinutes(row, 'laboral')).toBe(60)
    expect(auxiliaryMinutes(row, 'extra')).toBe(40)
  })
})
