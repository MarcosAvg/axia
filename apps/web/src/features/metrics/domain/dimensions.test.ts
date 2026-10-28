import { describe, expect, it } from 'vitest'
import { buildHierarchy, hierarchyPath } from './dimensions'
import type { DimensionRow } from './dimensions'

function row(
  id: string,
  name: string,
  tickets: number,
  parentId: string | null = null,
): DimensionRow {
  return { id, name, tickets, parentId } as DimensionRow
}

const groups = [
  { dimension: 'category' as const, row: row('cat-a', 'Eléctrico', 10) },
  { dimension: 'category' as const, row: row('cat-b', 'Plomería', 5) },
  {
    dimension: 'subcategory' as const,
    row: row('sub-a1', 'Iluminación', 6, 'cat-a'),
  },
  {
    dimension: 'subcategory' as const,
    row: row('sub-b1', 'Fugas', 5, 'cat-b'),
  },
  {
    dimension: 'problem' as const,
    row: row('prob-a1', 'Luminaria', 4, 'sub-a1'),
  },
]

describe('buildHierarchy', () => {
  it('anida categorías, subcategorías y problemas', () => {
    const tree = buildHierarchy(groups, hierarchyPath('problem'))
    expect(tree).toHaveLength(2)
    expect(tree[0]?.name).toBe('Eléctrico')
    expect(tree[0]?.value).toBe(10)
    expect(tree[0]?.children[0]?.name).toBe('Iluminación')
    expect(tree[0]?.children[0]?.children[0]?.name).toBe('Luminaria')
  })

  it('deja solo el nivel pedido', () => {
    const tree = buildHierarchy(groups, hierarchyPath('category'))
    expect(tree[0]?.children).toEqual([])
  })
})
