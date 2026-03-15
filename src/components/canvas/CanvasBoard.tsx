'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CanvasNode, CanvasEdge, Project, DevTask, Collaborator } from '@/types'
import { SpecNode } from './SpecNode'
import { ChatPanel } from './ChatPanel'
import { CollabCursors } from './CollabCursors'
import { TaskExport } from './TaskExport'
import { EvidenceDrawer } from './EvidenceDrawer'
import { Button } from '@/components/ui/button'
import { Plus, FileDown, BookOpen } from 'lucide-react'

interface Props {
  project: Project
  initialNodes: CanvasNode[]
  initialEdges: CanvasEdge[]
  initialTasks: DevTask[]
}

export function CanvasBoard({ project, initialNodes, initialEdges, initialTasks }: Props) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes)
  const [edges, setEdges] = useState<CanvasEdge[]>(initialEdges)
  const [tasks] = useState<DevTask[]>(initialTasks)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showTasks, setShowTasks] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  // Subscribe to realtime node changes
  useEffect(() => {
    const channel = supabase
      .channel(`canvas:${project.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'canvas_nodes',
        filter: `project_id=eq.${project.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNodes(prev => [...prev, payload.new as CanvasNode])
        } else if (payload.eventType === 'UPDATE') {
          setNodes(prev => prev.map(n => n.id === payload.new.id ? payload.new as CanvasNode : n))
        } else if (payload.eventType === 'DELETE') {
          setNodes(prev => prev.filter(n => n.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [project.id, supabase])

  // Track live cursor positions via Supabase presence
  useEffect(() => {
    const channel = supabase.channel(`presence:${project.id}`, {
      config: { presence: { key: 'cursor' } }
    })

    const COLORS = ['#7F77DD', '#1D9E75', '#D85A30', '#BA7517']

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const collabs: Collaborator[] = Object.entries(state).map(([key, values], i) => ({
          user_id: key,
          role: 'editor' as const,
          cursor: (values as unknown as Array<{ cursor: { x: number; y: number } }>)[0]?.cursor,
          color: COLORS[i % COLORS.length],
        }))
        setCollaborators(collabs)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    const canvasEl = canvasRef.current
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasEl) return
      const rect = canvasEl.getBoundingClientRect()
      channel.track({ cursor: { x: e.clientX - rect.left, y: e.clientY - rect.top } })
    }

    canvasEl?.addEventListener('mousemove', handleMouseMove)
    return () => {
      canvasEl?.removeEventListener('mousemove', handleMouseMove)
      supabase.removeChannel(channel)
    }
  }, [project.id, supabase])

  async function updateNodePosition(nodeId: string, pos: { x: number; y: number }) {
    await supabase
      .from('canvas_nodes')
      .update({ position: pos })
      .eq('id', nodeId)
  }

  async function resolveConflict(nodeId: string, resolution: string) {
    await supabase
      .from('canvas_nodes')
      .update({ status: 'resolved', resolution })
      .eq('id', nodeId)

    await supabase.from('decisions').insert({
      project_id: project.id,
      node_id: nodeId,
      title: 'Conflict resolved',
      rationale: resolution,
    })
  }

  async function addNode() {
    const { data } = await supabase
      .from('canvas_nodes')
      .insert({
        project_id: project.id,
        type: 'feature',
        title: 'New node',
        status: 'open',
        position: { x: 120, y: 120 },
        evidence: [],
      })
      .select()
      .single()

    if (data) {
      setNodes(prev => [...prev, data as CanvasNode])
      setSelectedNodeId(data.id)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Topbar */}
      <div className="absolute top-0 left-0 right-0 h-12 border-b bg-background flex items-center px-4 gap-3 z-20">
        <span className="text-sm font-medium flex-1 truncate">{project.name} — spec canvas</span>
        <div className="flex gap-2">
          {collaborators.slice(0, 4).map(c => (
            <div key={c.user_id} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: c.color + '22', color: c.color }}>
              {c.user_id.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={addNode}>
          <Plus className="w-3.5 h-3.5" />
          Add node
        </Button>
        {selectedNode && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowEvidence(v => !v)}>
            <BookOpen className="w-3.5 h-3.5" />
            Evidence
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowTasks(true)}>
          <FileDown className="w-3.5 h-3.5" />
          Export tasks
        </Button>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 mt-12 relative overflow-hidden bg-muted/30">
        {/* Grid dots background */}
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* SVG connectors */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map(edge => {
            const src = nodes.find(n => n.id === edge.source_id)
            const tgt = nodes.find(n => n.id === edge.target_id)
            if (!src || !tgt) return null
            return (
              <line key={edge.id}
                x1={src.position.x + 100} y1={src.position.y + 40}
                x2={tgt.position.x + 100} y2={tgt.position.y + 40}
                stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 3"
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <SpecNode
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            onSelect={() => setSelectedNodeId(node.id)}
            onMove={(pos) => updateNodePosition(node.id, pos)}
            onResolve={(res) => resolveConflict(node.id, res)}
          />
        ))}

        {/* Live cursors */}
        <CollabCursors collaborators={collaborators} />

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-sm">No nodes yet</p>
              <p className="text-xs">Complete the spec builder to auto-generate nodes, or add one manually.</p>
            </div>
          </div>
        )}
      </div>

      {/* Evidence drawer */}
      {selectedNode && showEvidence && (
        <EvidenceDrawer
          node={selectedNode}
          onClose={() => setShowEvidence(false)}
          onNodeUpdate={(updated) => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))}
        />
      )}

      {/* Chat panel */}
      {selectedNode && (
        <ChatPanel
          node={selectedNode}
          project={project}
          onClose={() => setSelectedNodeId(null)}
          onNodeUpdate={(updated) => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))}
        />
      )}

      {/* Task export drawer */}
      {showTasks && (
        <TaskExport
          tasks={tasks}
          projectId={project.id}
          onClose={() => setShowTasks(false)}
        />
      )}
    </div>
  )
}
