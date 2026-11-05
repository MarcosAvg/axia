import { navBadgeLabel, navBadgeText } from './nav-badge'

describe('navBadgeText', () => {
  it('recorta los conteos grandes', () => {
    expect(navBadgeText(0)).toBe('0')
    expect(navBadgeText(9)).toBe('9')
    expect(navBadgeText(10)).toBe('9+')
  })
})

describe('navBadgeLabel', () => {
  it('no etiqueta cuando no hay pendientes', () => {
    expect(navBadgeLabel('Bandeja', 0)).toBeNull()
  })

  it('concuerda en singular y plural', () => {
    expect(navBadgeLabel('Bandeja', 1, 'oferta')).toBe('Bandeja, 1 oferta')
    expect(navBadgeLabel('Bandeja', 3, 'oferta')).toBe('Bandeja, 3 ofertas')
  })
})
