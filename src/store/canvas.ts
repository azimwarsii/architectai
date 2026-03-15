import { create } from 'zustand'
import type { CanvasNode, CanvasEdge } from '@/types'

interface CanvasStore {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selectedNodeId: string | null
  setNodes: (nodes: CanvasNode[]) => void
  setEdges: (edges: CanvasEdge[]) => void
  updateNode: (id: string, patch: Partial<CanvasNode>) => void
  addNode: (node: CanvasNode) => void
  selectNode: (id: string | null) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  updateNode: (id, patch) =>
    set(state => ({ nodes: state.nodes.map(n => n.id === id ? { ...n, ...patch } : n) })),
  addNode: (node) =>
    set(state => ({ nodes: [...state.nodes, node] })),
  selectNode: (id) => set({ selectedNodeId: id }),
}))
