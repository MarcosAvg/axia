import { fireEvent, render, screen, within } from '@testing-library/react'
import type { AdminCatalogConfig } from '../domain/catalogs'
import { useCatalogList } from '../hooks/use-catalog-list'
import { CatalogTable } from './catalog-table'

const labels: Record<string, string> = {
  t1: 'Mantenimiento',
  t2: 'Seguridad',
}

const optionsFor = () =>
  Object.entries(labels).map(([id, label]) => ({ id, label }))

const flatConfig: AdminCatalogConfig = {
  key: 'teams',
  table: 'teams',
  title: 'Equipos',
  columns: [
    { key: 'name', label: 'Nombre' },
    { key: 'team_id', label: 'Equipo', optionsTable: 'teams' },
  ],
  fields: [],
}

const treeConfig: AdminCatalogConfig = {
  ...flatConfig,
  tree: { parentKey: 'parent_id', orderKey: 'position', labelKey: 'name' },
}

const accountConfig: AdminCatalogConfig = {
  ...flatConfig,
  columns: [
    ...flatConfig.columns,
    { key: 'user_label', label: 'Cuenta', format: 'account' },
  ],
}

type Row = Record<string, unknown>

function Harness({
  config,
  rows,
}: {
  config: AdminCatalogConfig
  rows: Row[]
}) {
  const list = useCatalogList(config, rows, optionsFor)
  return (
    <CatalogTable
      rows={list.visibleRows}
      columns={list.columns}
      tree={config.tree}
      isFiltering={list.isFiltering}
      optionsFor={optionsFor}
      sort={list.sort}
      onSortChange={list.toggleSort}
      onEdit={() => undefined}
      onToggle={() => undefined}
      onDelete={() => undefined}
    />
  )
}

function tableRowTexts(): string[] {
  const table = screen.getByRole('table')
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent ?? '')
}

describe('CatalogTable con orden', () => {
  it('ordena por la etiqueta visible de una relación y no por su identificador', () => {
    render(
      <Harness
        config={flatConfig}
        rows={[
          { id: 'a', name: 'Alfa', team_id: 't2', active: true },
          { id: 'b', name: 'Beta', team_id: 't1', active: true },
        ]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Equipo/ }))
    expect(tableRowTexts()[0]).toContain('Beta')
    fireEvent.click(screen.getByRole('button', { name: /Equipo/ }))
    expect(tableRowTexts()[0]).toContain('Alfa')
  })
})

describe('CatalogTable con árbol', () => {
  it('contrae un motivo y oculta a sus descendientes', () => {
    render(
      <Harness
        config={treeConfig}
        rows={[
          {
            id: 'raiz',
            name: 'Falta de material',
            parent_id: null,
            position: 1,
            active: true,
          },
          {
            id: 'hija',
            name: 'En cotización',
            parent_id: 'raiz',
            position: 1,
            active: true,
          },
        ]}
      />,
    )
    expect(screen.getByRole('table').textContent).toContain('En cotización')
    fireEvent.click(
      screen.getByRole('button', { name: 'Contraer: Falta de material' }),
    )
    expect(screen.getByRole('table').textContent).not.toContain('En cotización')
  })
})

describe('CatalogTable con cuentas', () => {
  it('marca la cuenta vinculada cuando está inactiva', () => {
    render(
      <Harness
        config={accountConfig}
        rows={[
          {
            id: 'a',
            name: 'Alfa',
            team_id: 't1',
            user_label: 'ana',
            user_active: false,
            active: true,
          },
        ]}
      />,
    )
    const table = screen.getByRole('table')
    expect(within(table).getByText('ana')).toBeInTheDocument()
    expect(within(table).getByText('Inactivo')).toBeInTheDocument()
  })
})
