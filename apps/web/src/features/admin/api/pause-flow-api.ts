import { apiFetch } from '@/lib/api-client'

interface PauseFlowNode {
  id: string
  parentId: string | null
  name: string
  kind: 'progress' | 'exit' | null
  active: boolean
}

export interface PauseFlowEdge {
  from: string
  to: string
}

export interface PauseFlow {
  rootId: string
  rootName: string
  nodes: PauseFlowNode[]
  edges: PauseFlowEdge[]
}

export async function adminPauseFlows(): Promise<PauseFlow[]> {
  const body = await apiFetch<{ items: PauseFlow[] }>('/api/admin/pause-flow')
  return body.items
}

export async function adminSavePauseFlow(
  rootId: string,
  edges: PauseFlowEdge[],
): Promise<void> {
  await apiFetch(`/api/admin/pause-flow/${rootId}`, {
    method: 'PUT',
    body: JSON.stringify({ edges }),
  })
}
