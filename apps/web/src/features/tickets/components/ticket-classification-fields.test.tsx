import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm, useWatch } from 'react-hook-form'
import { beforeEach, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import type { ProblemSearchOption } from '@/features/catalogs'
import type { CreateTicketInput } from '../schemas'
import { TicketClassificationFields } from './ticket-classification-fields'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

const problems: ProblemSearchOption[] = [
  {
    id: 'p1',
    name: 'Lámpara apagada',
    categoryId: 'c1',
    categoryName: 'Eléctrico',
    subcategoryId: 's1',
    subcategoryName: 'Iluminación',
    requiredAttachmentTypes: [],
    attachmentInstructions: null,
  },
  {
    id: 'p2',
    name: 'Lámpara apagada',
    categoryId: 'c2',
    categoryName: 'Mobiliario',
    subcategoryId: 's2',
    subcategoryName: 'Escritorios',
    requiredAttachmentTypes: ['application/pdf'],
    attachmentInstructions: 'Adjunta PDF',
  },
]

function Harness({ loaded = false }: { loaded?: boolean }) {
  const form = useForm<CreateTicketInput>({
    defaultValues: {
      categoryId: '',
      subcategoryId: '',
      problemId: '',
      channelId: '',
    },
  })
  const values = useWatch({ control: form.control })
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <TicketClassificationFields
        form={form}
        categories={[
          { id: 'c1', name: 'Eléctrico' },
          { id: 'c2', name: 'Mobiliario' },
        ]}
        subcategories={
          loaded ? [{ id: 's2', name: 'Escritorios', categoryId: 'c2' }] : []
        }
        problems={loaded ? [problems[1]!] : []}
        channels={[]}
        showChannel={false}
      />
      <output aria-label="Valores">{JSON.stringify(values)}</output>
      <output aria-label="Modificado">{String(form.formState.isDirty)}</output>
    </form>
  )
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  )
  return { ...view, client }
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
  vi.mocked(apiFetch).mockResolvedValue({ items: problems })
})

it('solo cambia los campos al elegir y conserva la selección al cargar opciones', async () => {
  const { rerender, client } = setup()
  fireEvent.change(screen.getByLabelText('Buscar problema'), {
    target: { value: 'lamapra' },
  })
  const result = await screen.findByRole('button', {
    name: /Lámpara apagada Mobiliario/,
  })
  expect(screen.getByLabelText('Valores')).toHaveTextContent('"problemId":""')
  fireEvent.click(result)
  expect(screen.getByLabelText('Categoría', { exact: true })).toHaveValue('c2')
  expect(screen.getByLabelText('Subcategoría')).toHaveValue('s2')
  expect(screen.getByLabelText('Problema', { exact: true })).toHaveValue('p2')
  expect(screen.getByLabelText('Modificado')).toHaveTextContent('true')
  rerender(
    <QueryClientProvider client={client}>
      <Harness loaded />
    </QueryClientProvider>,
  )
  expect(screen.getByLabelText('Problema', { exact: true })).toHaveValue('p2')
  fireEvent.change(screen.getByLabelText('Categoría', { exact: true }), {
    target: { value: 'c1' },
  })
  expect(screen.getByLabelText('Valores')).toHaveTextContent(
    '"subcategoryId":""',
  )
  expect(screen.getByLabelText('Valores')).toHaveTextContent('"problemId":""')
})

it('permite seleccionar con flechas y Enter y cerrar con Escape', async () => {
  setup()
  const input = screen.getByLabelText('Buscar problema')
  fireEvent.change(input, { target: { value: 'lampara' } })
  const first = await screen.findByRole('button', {
    name: /Lámpara apagada Eléctrico/,
  })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(first).toHaveFocus()
  fireEvent.keyDown(first, { key: 'ArrowDown' })
  const second = screen.getByRole('button', {
    name: /Lámpara apagada Mobiliario/,
  })
  expect(second).toHaveFocus()
  fireEvent.click(second)
  expect(screen.getByLabelText('Valores')).toHaveTextContent('"problemId":"p2"')
  fireEvent.change(input, { target: { value: 'lampara' } })
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(
    screen.queryByRole('button', { name: /Lámpara apagada/ }),
  ).not.toBeInTheDocument()
  fireEvent.change(input, { target: { value: 'apagda' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(screen.getByLabelText('Valores')).toHaveTextContent('"problemId":"p1"')
})

it('informa que no hay resultados sin modificar la clasificación', async () => {
  setup()
  fireEvent.change(screen.getByLabelText('Buscar problema'), {
    target: { value: 'computadora' },
  })
  expect(
    await screen.findByText('No se encontraron problemas.'),
  ).toBeInTheDocument()
  expect(screen.getByLabelText('Valores')).toHaveTextContent('"problemId":""')
})

it('muestra carga y permite reintentar un error de lectura', async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Sin conexión'))
  setup()
  expect(screen.getByText('Cargando problemas…')).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
  fireEvent.change(screen.getByLabelText('Buscar problema'), {
    target: { value: 'lampara' },
  })
  await waitFor(() =>
    expect(
      screen.getAllByRole('button', { name: /Lámpara apagada/ }),
    ).toHaveLength(2),
  )
})
