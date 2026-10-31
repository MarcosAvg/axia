import { reasonParentOptions } from './reason-parents'

const options = [
  { id: 'root', use: 'pause', parentId: null },
  { id: 'child', use: 'pause', parentId: 'root' },
  { id: 'grandchild', use: 'pause', parentId: 'child' },
  { id: 'other', use: 'pause', parentId: null },
  { id: 'rejection', use: 'rejection', parentId: null },
]
it('excluye el propio motivo y todos sus descendientes de los padres elegibles', () => {
  expect(
    reasonParentOptions(options, 'pause', 'root').map((item) => item.id),
  ).toEqual(['other'])
})
it('ofrece padres únicamente del uso seleccionado y permite crear jerarquías profundas', () => {
  expect(reasonParentOptions(options, 'pause').map((item) => item.id)).toEqual([
    'root',
    'child',
    'grandchild',
    'other',
  ])
  expect(reasonParentOptions(options, '').map((item) => item.id)).toEqual([])
})
it('termina aun si el catálogo contiene un ciclo antiguo', () => {
  const cycle = [
    { id: 'a', use: 'pause', parentId: 'b' },
    { id: 'b', use: 'pause', parentId: 'a' },
  ]
  expect(reasonParentOptions(cycle, 'pause', 'a')).toEqual([])
})
