import {
  canonicalRow,
  isNoData,
  normalizeLabel,
  parseSourceDate,
} from './sheet'

const TZ = 'America/Mexico_City'

describe('normalizeLabel', () => {
  it('quita acentos, espacios y mayúsculas', () => {
    expect(normalizeLabel('  Extención ')).toBe('EXTENCION')
    expect(normalizeLabel('Técnico de Mtto')).toBe('TECNICO DE MTTO')
  })
})

describe('canonicalRow', () => {
  it('mapea cabeceras con erratas a las columnas canónicas', () => {
    const row = canonicalRow({
      ID: ' 123 ',
      Edificio: 'Edificio A',
      Extención: 'ext. 1',
      Estatus: 'EN PROCESO',
    })
    expect(row.externalId).toBe('123')
    expect(row.building).toBe('Edificio A')
    expect(row.extension).toBe('ext. 1')
    expect(row.status).toBe('EN PROCESO')
    expect(row.location).toBeNull()
  })
})

describe('isNoData', () => {
  it('reconoce los marcadores de sin dato', () => {
    expect(isNoData('No atendido')).toBe(true)
    expect(isNoData('No contabilizado')).toBe(true)
    expect(isNoData(null)).toBe(true)
    expect(isNoData('17/jun/2026')).toBe(false)
  })
})

describe('parseSourceDate', () => {
  it('interpreta la fecha en la zona configurada', () => {
    expect(parseSourceDate('17/jun/2026 - [14:14:00]', TZ)).toBe(
      '2026-06-17T20:14:00.000Z',
    )
    expect(parseSourceDate('17/jun/2026', TZ)).toBe('2026-06-17T06:00:00.000Z')
  })

  it('devuelve null con marcadores o formato inválido', () => {
    expect(parseSourceDate('No atendido', TZ)).toBeNull()
    expect(parseSourceDate('sin fecha', TZ)).toBeNull()
    expect(parseSourceDate(null, TZ)).toBeNull()
  })
})
