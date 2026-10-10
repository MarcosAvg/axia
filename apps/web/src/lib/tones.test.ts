import {
  TONES,
  toneClasses,
  toneForId,
  toneForIndex,
  toneForPriority,
} from './tones'

describe('toneForIndex', () => {
  it('rota por la paleta', () => {
    expect(toneForIndex(0)).toBe('tone-1')
    expect(toneForIndex(5)).toBe('tone-6')
    expect(toneForIndex(6)).toBe('tone-1')
  })

  it('admite negativos y números grandes sin salirse', () => {
    expect(TONES).toContain(toneForIndex(-1))
    expect(TONES).toContain(toneForIndex(1000))
  })
})

describe('toneForId', () => {
  it('es determinista para el mismo texto', () => {
    expect(toneForId('Equipo Alfa')).toBe(toneForId('Equipo Alfa'))
  })

  it('siempre devuelve un tono válido', () => {
    expect(TONES).toContain(toneForId(''))
    expect(TONES).toContain(toneForId('categoría-123'))
  })
})

describe('toneForPriority', () => {
  it('colorea por nivel', () => {
    expect(toneForPriority(1)).toBe('tone-5')
    expect(toneForPriority(2)).toBe('tone-4')
    expect(toneForPriority(3)).toBe('tone-1')
    expect(toneForPriority(4)).toBe('tone-6')
  })

  it('usa el tono medio cuando no hay posición', () => {
    expect(toneForPriority(null)).toBe('tone-1')
    expect(toneForPriority(undefined)).toBe('tone-1')
  })
})

describe('toneClasses', () => {
  it('define clases para cada tono', () => {
    for (const tone of TONES) {
      expect(toneClasses[tone].text).toContain(tone)
      expect(toneClasses[tone].chip).toContain(tone)
    }
  })
})
