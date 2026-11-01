import type { AdminTable } from '../api/admin-api'
import { cellSortValue, cellText, fixedOptionLabel } from './catalog-cell'
import type { AdminColumn } from './catalogs'

const optionsFor = (table: AdminTable) =>
  table === 'teams'
    ? [
        { id: 't1', label: 'Mantenimiento' },
        { id: 't2', label: 'Seguridad' },
      ]
    : []

const useOptions = [
  { value: 'pause', label: 'Pausa' },
  { value: 'claim', label: 'Reclamación' },
]

const emptyOptions = (): { id: string; label: string }[] => []

describe('cellText con catálogos', () => {
  it('resuelve la etiqueta de una relación y no muestra el identificador', () => {
    const column: AdminColumn = {
      key: 'team_id',
      label: 'Equipo',
      optionsTable: 'teams',
    }
    expect(cellText(column, { team_id: 't2' }, optionsFor)).toBe('Seguridad')
  })

  it('traduce enums fijos y deja vacío lo desconocido', () => {
    const column: AdminColumn = {
      key: 'use',
      label: 'Uso',
      options: useOptions,
    }
    expect(cellText(column, { use: 'pause' }, optionsFor)).toBe('Pausa')
    expect(cellText(column, { use: null }, optionsFor)).toBe('')
  })

  it('muestra la cuenta vinculada y deja vacío cuando no existe', () => {
    const column: AdminColumn = {
      key: 'user_label',
      label: 'Cuenta',
      format: 'account',
    }
    expect(cellText(column, { user_label: 'tecnico' }, emptyOptions)).toBe(
      'tecnico',
    )
    expect(cellText(column, { user_label: null }, emptyOptions)).toBe('')
  })
})

describe('cellText con formatos', () => {
  it('formatea tiempos objetivo', () => {
    const column: AdminColumn = {
      key: 'target_minutes',
      label: 'Objetivo',
      format: 'minutes',
    }
    expect(cellText(column, { target_minutes: 150 }, emptyOptions)).toBe(
      '2 h 30 min',
    )
  })

  it('traduce booleanos y cuentas', () => {
    expect(
      cellText(
        { key: 'requires_note', label: 'Nota' },
        { requires_note: false },
        emptyOptions,
      ),
    ).toBe('No')
    expect(
      cellText(
        { key: 'problems_count', label: 'Problemas' },
        { problems_count: 4 },
        emptyOptions,
      ),
    ).toBe('4')
  })

  it('formatea la fecha de actualización', () => {
    const text = cellText(
      { key: 'updated_at', label: 'Actualizado', format: 'datetime' },
      { updated_at: '2026-01-15T10:00:00.000Z' },
      emptyOptions,
    )
    expect(text).toContain('2026')
  })
})

describe('cellSortValue', () => {
  const teams: AdminColumn = {
    key: 'team_id',
    label: 'Equipo',
    optionsTable: 'teams',
  }

  it('ordena las relaciones por su etiqueta, no por el identificador', () => {
    expect(cellSortValue(teams, { team_id: 't2' }, optionsFor)).toBe(
      'Seguridad',
    )
    expect(cellSortValue(teams, { team_id: null }, optionsFor)).toBeNull()
  })

  it('ordena los enums por su etiqueta', () => {
    const column: AdminColumn = {
      key: 'use',
      label: 'Uso',
      options: useOptions,
    }
    expect(cellSortValue(column, { use: 'claim' }, optionsFor)).toBe(
      'Reclamación',
    )
  })

  it('conserva el número y la fecha para ordenarlos', () => {
    expect(
      cellSortValue(
        { key: 'target_minutes', label: 'Objetivo', format: 'minutes' },
        { target_minutes: 90 },
        emptyOptions,
      ),
    ).toBe(90)
    expect(
      cellSortValue(
        { key: 'updated_at', label: 'Actualizado', format: 'datetime' },
        { updated_at: '2026-01-15T10:00:00.000Z' },
        emptyOptions,
      ),
    ).toBe('2026-01-15T10:00:00.000Z')
  })
})

describe('fixedOptionLabel', () => {
  it('conserva el valor si no hay etiqueta', () => {
    expect(fixedOptionLabel(useOptions, 'otro')).toBe('otro')
  })
})
