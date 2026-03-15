'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CanvasNode, CanvasEdge, Project, DevTask, Decision, Collaborator } from '@/types'
import { SpecNode } from './SpecNode'
import { ChatPanel } from './ChatPanel'
import { CanvasSidebar } from './CanvasSidebar'
import { CollabCursors } from './CollabCursors'
import { TaskExport } from './TaskExport'
import { QuestionEngine } from '@/components/questions/QuestionEngine'
import { Plus, FileDown, Settings, LogOut } from 'lucide-react'

interface Props {
  project: Project
  initialNodes: CanvasNode[]
  initialEdges: CanvasEdge[]
  initialTasks: DevTask[]
  initialDecisions: Decision[]
}

export function CanvasBoard({ project, initialNodes, initialEdges, initialTasks, initialDecisions }: Props) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes)
  const [edges, setEdges] = useState<CanvasEdge[]>(initialEdges)
  const [tasks] = useState<DevTask[]>(initialTasks)
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showTasks, setShowTasks] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserInitials, setCurrentUserInitials] = useState('U')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [selfCursor, setSelfCursor] = useState<{ x: number; y: number } | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(project.status !== 'canvas')

  // Get current user so we can exclude our own cursor and show avatar
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'U'
      setCurrentUserInitials(name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase())
    })
  }, [supabase])

  // Close user menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    if (showUserMenu) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showUserMenu])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

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
          // Dedup — realtime may replay nodes already in initialNodes
          setNodes(prev =>
            prev.some(n => n.id === (payload.new as CanvasNode).id)
              ? prev
              : [...prev, payload.new as CanvasNode]
          )
        } else if (payload.eventType === 'UPDATE') {
          setNodes(prev => prev.map(n => n.id === payload.new.id ? payload.new as CanvasNode : n))
        } else if (payload.eventType === 'DELETE') {
          setNodes(prev => prev.filter(n => n.id !== payload.old.id))
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'decisions',
        filter: `project_id=eq.${project.id}`,
      }, (payload) => {
        setDecisions(prev =>
          prev.some(d => d.id === (payload.new as Decision).id)
            ? prev
            : [payload.new as Decision, ...prev]
        )
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
        // Filter out the current user so their cursor isn't rendered as a second cursor
        const collabs: Collaborator[] = Object.entries(state)
          .filter(([key]) => key !== currentUserId)
          .map(([key, values], i) => ({
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
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      channel.track({ cursor: { x, y } })
      setSelfCursor({ x, y })
    }
    const handleMouseLeave = () => setSelfCursor(null)

    canvasEl?.addEventListener('mousemove', handleMouseMove)
    canvasEl?.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      canvasEl?.removeEventListener('mousemove', handleMouseMove)
      canvasEl?.removeEventListener('mouseleave', handleMouseLeave)
      supabase.removeChannel(channel)
    }
  }, [project.id, supabase])

  async function updateNodePosition(nodeId: string, pos: { x: number; y: number }) {
    await supabase.from('canvas_nodes').update({ position: pos }).eq('id', nodeId)
  }

  async function resolveConflict(nodeId: string, resolution: string) {
    await supabase.from('canvas_nodes').update({ status: 'resolved', resolution }).eq('id', nodeId)
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
        position: { x: 140, y: 100 },
        evidence: [],
      })
      .select()
      .single()

    if (data) {
      setNodes(prev =>
        prev.some(n => n.id === data.id) ? prev : [...prev, data as CanvasNode]
      )
      setSelectedNodeId(data.id)
    }
  }

  const onlineCount = collaborators.length + 1

  return (
    <div className="flex h-full overflow-hidden bg-[#0d0e14] text-zinc-100" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif' }}>
      {/* Project-specific left sidebar */}
      <CanvasSidebar
        projectId={project.id}
        projectName={project.name}
        nodes={nodes}
        decisions={decisions}
        selectedNodeId={selectedNodeId}
        onSelectNode={(id) => setSelectedNodeId(prev => prev === id ? null : id)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="h-11 border-b border-white/[0.07] bg-[#0f1018] flex items-center px-4 gap-3 flex-shrink-0">
          <span className="text-[13px] font-medium text-zinc-200 flex-1 truncate">{project.name}</span>

          {/* Online pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-emerald-400">{onlineCount} online</span>
          </div>

          {/* Collaborator avatars */}
          {collaborators.length > 0 && (
            <div className="flex -space-x-1.5">
              {collaborators.slice(0, 4).map(c => (
                <div
                  key={c.user_id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-[#0f1018]"
                  style={{ background: c.color + '28', color: c.color }}
                  title={c.user_id}
                >
                  {c.user_id.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addNode}
            className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium text-zinc-400 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add node
          </button>

          <button
            onClick={() => setShowTasks(true)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors"
          >
            <FileDown className="w-3 h-3" />
            Export tasks
          </button>

          {/* User menu */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all"
              style={{
                background: showUserMenu ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e4e4e7',
              }}
              title="Account"
            >
              {currentUserInitials}
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-44 z-50 rounded-xl overflow-hidden"
                style={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              >
                <div className="p-1">
                  <a
                    href="/settings"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-300 transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </a>
                  <a
                    href="/dashboard"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-300 transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Dashboard
                  </a>
                </div>
                <div className="p-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                    style={{ color: '#f87171', background: 'transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas + Chat row */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden"
            style={{
              background: '#0d0e14',
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              cursor: 'none',
            }}
            onClick={() => setSelectedNodeId(null)}
          >
            {/* SVG connectors */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.source_id)
                const tgt = nodes.find(n => n.id === edge.target_id)
                if (!src || !tgt) return null
                return (
                  <line
                    key={edge.id}
                    x1={src.position.x + 104} y1={src.position.y + 40}
                    x2={tgt.position.x + 104} y2={tgt.position.y + 40}
                    stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" strokeDasharray="5 4"
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
                onSelect={(id) => setSelectedNodeId(id)}
                onMove={(pos) => updateNodePosition(node.id, pos)}
                onResolve={(res) => resolveConflict(node.id, res)}
              />
            ))}

            {/* Live cursors (other collaborators only) */}
            <CollabCursors collaborators={collaborators} />

            {/* Self cursor — replaces native cursor over canvas */}
            {selfCursor && (
              <div className="absolute pointer-events-none z-40" style={{ left: selfCursor.x, top: selfCursor.y }}>
                <svg width="18" height="22" viewBox="0 0 16 20" fill="none">
                  <path d="M0 0L0 16L4.5 11.5L7 18L9 17.5L6.5 11L12 11L0 0Z" fill="#F5E642" stroke="#000" strokeWidth="1.5" />
                </svg>
              </div>
            )}

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-2">
                  <p className="text-[13px] text-zinc-500 font-medium">Canvas is empty</p>
                  <p className="text-[12px] text-zinc-600 leading-relaxed">
                    Complete the spec builder to auto-generate nodes,<br />or click "Add node" to start manually.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Chat panel */}
          {selectedNode && (
            <ChatPanel
              node={selectedNode}
              project={project}
              onClose={() => setSelectedNodeId(null)}
              onNodeUpdate={(updated) => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))}
            />
          )}
        </div>
      </div>

      {/* Task export drawer */}
      {showTasks && (
        <TaskExport
          tasks={tasks}
          projectId={project.id}
          onClose={() => setShowTasks(false)}
        />
      )}

      {/* Onboarding overlay — shown until spec questions are answered */}
      {showOnboarding && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            background: '#0d0e14',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        >
          <div
            className="relative w-full flex flex-col bg-white"
            style={{
              maxWidth: 680,
              maxHeight: '88vh',
              margin: '0 24px',
              borderRadius: 20,
              border: '2px solid #000',
              boxShadow: '8px 8px 0 0 #F5E642',
              overflow: 'hidden',
            }}
          >
            <QuestionEngine
              projectId={project.id}
              onComplete={() => setShowOnboarding(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
