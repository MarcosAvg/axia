import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectField } from '@/components/shared/form-fields'
import { adminPauseFlows, adminSavePauseFlow } from '../api/pause-flow-api'
import type { PauseFlow, PauseFlowEdge } from '../api/pause-flow-api'
import { adminMessages } from '../i18n'

const messages = adminMessages.pauseFlow
type Node = PauseFlow['nodes'][number]

function optionLabel(name: string, kind: Node['kind']) {
  if (kind === 'exit') return `${name} · ${messages.exit}`
  if (kind === 'progress') return `${name} · ${messages.progress}`
  return name
}

function NodeLegend({ nodes }: { nodes: Node[] }) {
  return (
    <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {nodes
        .filter((node) => node.parentId !== null)
        .map((node) => (
          <li key={node.id} className="rounded-full border px-2 py-1">
            {node.name}:{' '}
            {node.kind === 'exit' ? messages.exit : messages.progress}
          </li>
        ))}
    </ul>
  )
}

function EdgeRow({
  edge,
  index,
  fromOptions,
  toOptions,
  onChange,
  onRemove,
}: {
  edge: PauseFlowEdge
  index: number
  fromOptions: { value: string; label: string }[]
  toOptions: { value: string; label: string }[]
  onChange: (patch: Partial<PauseFlowEdge>) => void
  onRemove: () => void
}) {
  return (
    <li className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <SelectField
        id={`pause-flow-from-${index}`}
        label={messages.from}
        options={fromOptions}
        value={edge.from}
        onChange={(event) => onChange({ from: event.target.value })}
      />
      <SelectField
        id={`pause-flow-to-${index}`}
        label={messages.to}
        options={toOptions}
        value={edge.to}
        onChange={(event) => onChange({ to: event.target.value })}
      />
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 text-destructive"
        onClick={onRemove}
      >
        {messages.remove}
      </Button>
    </li>
  )
}

function FlowActions({
  isSaving,
  onAdd,
  onSave,
}: {
  isSaving: boolean
  onAdd: () => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onAdd}>
        {messages.add}
      </Button>
      <Button type="button" onClick={onSave} disabled={isSaving}>
        {isSaving ? adminMessages.actions.saving : messages.save}
      </Button>
    </div>
  )
}

function flowOptions(flow: PauseFlow) {
  const fromOptions = flow.nodes
    .filter((node) => node.kind !== 'exit')
    .map((node) => ({
      value: node.id,
      label: optionLabel(node.name, node.kind),
    }))
  const toOptions = flow.nodes
    .filter((node) => node.parentId !== null)
    .map((node) => ({
      value: node.id,
      label: optionLabel(node.name, node.kind),
    }))
  return { fromOptions, toOptions }
}

function useFlowEditor(flow: PauseFlow) {
  const queryClient = useQueryClient()
  const [edges, setEdges] = useState<PauseFlowEdge[]>(flow.edges)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { fromOptions, toOptions } = flowOptions(flow)

  function update(index: number, patch: Partial<PauseFlowEdge>) {
    setSaved(false)
    setEdges((current) =>
      current.map((edge, position) =>
        position === index ? { ...edge, ...patch } : edge,
      ),
    )
  }

  function remove(index: number) {
    setSaved(false)
    setEdges((current) => current.filter((_, position) => position !== index))
  }

  function add() {
    const target = flow.nodes.find(
      (node) => node.kind === 'progress' && node.parentId !== null,
    )
    if (!target) return
    setSaved(false)
    setEdges((current) => [...current, { from: flow.rootId, to: target.id }])
  }

  async function save() {
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      await adminSavePauseFlow(flow.rootId, edges)
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'pause-flow'] })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : messages.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    edges,
    error,
    saved,
    isSaving,
    fromOptions,
    toOptions,
    update,
    remove,
    add,
    save,
  }
}

function FlowEditor({ flow }: { flow: PauseFlow }) {
  const editor = useFlowEditor(flow)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{messages.help}</p>
      <NodeLegend nodes={flow.nodes} />
      {editor.edges.length === 0 ? (
        <p className="text-sm text-muted-foreground">{messages.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {editor.edges.map((edge, index) => (
            <EdgeRow
              key={`${edge.from}-${edge.to}-${index}`}
              edge={edge}
              index={index}
              fromOptions={editor.fromOptions}
              toOptions={editor.toOptions}
              onChange={(patch) => editor.update(index, patch)}
              onRemove={() => editor.remove(index)}
            />
          ))}
        </ul>
      )}
      {editor.error ? (
        <p className="text-sm text-destructive">{editor.error}</p>
      ) : null}
      {editor.saved ? (
        <p className="text-sm text-success" role="status">
          {messages.saved}
        </p>
      ) : null}
      <FlowActions
        isSaving={editor.isSaving}
        onAdd={editor.add}
        onSave={() => void editor.save()}
      />
    </div>
  )
}

/** Editor del flujo de avance y salida de cada motivo de pausa. */
export function PauseFlowEditor() {
  const query = useQuery({
    queryKey: ['admin', 'pause-flow'],
    queryFn: adminPauseFlows,
  })
  const [rootId, setRootId] = useState('')
  const flows = query.data ?? []
  const flow = flows.find((item) => item.rootId === rootId) ?? flows[0]

  if (query.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        {adminMessages.list.loading}
      </p>
    )
  }
  if (query.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {messages.loadError}
      </p>
    )
  }
  if (!flow) {
    return <p className="text-sm text-muted-foreground">{messages.noMotive}</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SelectField
          id="pause-flow-root"
          label={messages.motive}
          options={flows.map((item) => ({
            value: item.rootId,
            label: item.rootName,
          }))}
          value={flow.rootId}
          onChange={(event) => setRootId(event.target.value)}
        />
        <FlowEditor key={flow.rootId} flow={flow} />
      </CardContent>
    </Card>
  )
}
