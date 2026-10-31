import { act, renderHook } from '@testing-library/react'
import { reasonsCatalog } from '../domain/catalogs-reasons'
import { useCatalogForm } from './use-catalog-form'

it('limpia el padre anterior al cambiar el uso y muestra solamente padres compatibles', () => {
  const options = [
    { id: 'pause-parent', label: 'Material', use: 'pause' },
    { id: 'reject-parent', label: 'Fuera de alcance', use: 'rejection' },
  ]
  const { result } = renderHook(() =>
    useCatalogForm({
      fields: reasonsCatalog.fields,
      row: { id: 'child', use: 'pause', parent_id: 'pause-parent' },
      optionsFor: () => options,
      onSave: () => undefined,
    }),
  )
  act(() => result.current.onChange('use', 'rejection'))
  expect(result.current.raw.parent_id).toBe('')
  const field = reasonsCatalog.fields.find((item) => item.name === 'parent_id')!
  expect(result.current.fieldOptions(field).map((item) => item.id)).toEqual([
    'reject-parent',
  ])
})
