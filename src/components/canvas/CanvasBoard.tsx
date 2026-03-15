'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CanvasNode, CanvasEdge, Project, DevTask, Decision, Collaborator } from '@/types'
import { SpecNode } from './SpecNode'
import { ChatPanel } from './ChatPanel'
import { CanvasSidebar } from './CanvasSidebar'
import { CollabCursors } from './CollabCursors'
import { TaskExport } from './TaskExport'
import { EvidenceDrawer } from './EvidenceDrawer'
import { InviteDialog } from './InviteDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { Plus, FileDown, Settings, LogOut, UserPlus, Eye } from 'lucide-react'

interface Props {
  project: Project
  initialNodes: CanvasNode[]
  initialEdges: CanvasEdge[]
  initialTasks: DevTask[]
  initialDecisions: Decision[]
}

// Track recent edits for conflict detection
interface EditRecord {
  userId: string
  userName: string
  timestamp: number
  content: { title: string; body?: string }
}

const CONFLICT_WINDOW_MS = 30000 // 30 seconds

export function CanvasBoard({ project, initialNodes, initialEdges, initialTasks, initialDecisions }: Props) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLDivElement>(null)
  const permissions = usePermissions(project.id)

  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes)
  const [edges, setEdges] = useState<CanvasEdge[]>(initialEdges)
  const [tasks] = useState<DevTask[]>(initialTasks)
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [evidenceNodeId, setEvidenceNodeId] = useState<string | null>(null)
  const [showTasks, setShowTasks] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserInitials, setCurrentUserInitials] = useState('U')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Edge creation state
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; side: 'left' | 'right' } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // Conflict detection: track recent edits per node
  const editTrackerRef = useRef<Map<string, EditRecord>>(new Map())

  // Refs for values needed in realtime handler to avoid re-subscriptions
  const nodesRef = useRef(nodes)
  const collaboratorsRef = useRef(collaborators)
  const currentUserIdRef = useRef(currentUserId)

  // Keep refs in sync
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { collaboratorsRef.current = collaborators }, [collaborators])
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])

  // Get current user so we can exclude our own cursor and show avatar
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User'
      setCurrentUserName(name)
      setCurrentUserEmail(user.email || '')
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
  const evidenceNode =
    evidenceNodeId != null ? (nodes.find(n => n.id === evidenceNodeId) ?? null) : null

  // Subscribe to realtime node and edge changes
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
          const updatedNode = payload.new as CanvasNode
          const currentNodes = nodesRef.current
          const currentCollabs = collaboratorsRef.current
          const userId = currentUserIdRef.current
          const oldNode = currentNodes.find(n => n.id === updatedNode.id)

          // Conflict detection: check if another user edited within the conflict window
          if (oldNode && updatedNode.type !== 'conflict') {
            const recentEdit = editTrackerRef.current.get(updatedNode.id)
            const now = Date.now()

            if (recentEdit &&
                recentEdit.userId === userId && // We made the recent edit
                (now - recentEdit.timestamp) < CONFLICT_WINDOW_MS && // Within window
                (updatedNode.title !== recentEdit.content.title ||
                 updatedNode.body !== recentEdit.content.body)) { // Content changed by someone else
              // Detect which user made the remote change
              const remoteUserId = updatedNode.created_by || 'unknown'
              const remoteUserName = currentCollabs.find(c => c.user_id === remoteUserId)?.name || 'Another user'

              createConflictNode(
                oldNode,
                recentEdit,
                remoteUserId,
                remoteUserName,
                { title: updatedNode.title, body: updatedNode.body }
              )
            }

            // Track this incoming edit
            if (userId) {
              const editorUserId = updatedNode.created_by || 'remote'
              const editorName = currentCollabs.find(c => c.user_id === editorUserId)?.name || 'Remote user'
              editTrackerRef.current.set(updatedNode.id, {
                userId: editorUserId,
                userName: editorName,
                timestamp: now,
                content: { title: updatedNode.title, body: updatedNode.body },
              })
            }
          }

          setNodes(prev => prev.map(n => n.id === payload.new.id ? payload.new as CanvasNode : n))
        } else if (payload.eventType === 'DELETE') {
          setNodes(prev => prev.filter(n => n.id !== payload.old.id))
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'canvas_edges',
        filter: `project_id=eq.${project.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEdges(prev =>
            prev.some(e => e.id === (payload.new as CanvasEdge).id)
              ? prev
              : [...prev, payload.new as CanvasEdge]
          )
        } else if (payload.eventType === 'DELETE') {
          setEdges(prev => prev.filter(e => e.id !== payload.old.id))
          if (selectedEdgeId === payload.old.id) setSelectedEdgeId(null)
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
  }, [project.id, supabase, selectedEdgeId])

  // Presence channel ref for sharing with child components
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')

  // Track live cursor positions via Supabase presence
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase.channel(`presence:${project.id}`, {
      config: { presence: { key: currentUserId } }
    })
    presenceChannelRef.current = channel

    const COLORS = ['#7F77DD', '#1D9E75', '#D85A30', '#BA7517', '#E11D48', '#0891B2', '#65A30D', '#DC2626']

    interface PresencePayload {
      cursor?: { x: number; y: number }
      name?: string
      email?: string
      activeNodeId?: string | null
      isTyping?: boolean
      lastActivity?: number
    }

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Filter out the current user
        const collabs: Collaborator[] = Object.entries(state)
          .filter(([key]) => key !== currentUserId)
          .map(([key, values], i) => {
            const data = (values as unknown as PresencePayload[])[0] || {}
            return {
              user_id: key,
              role: 'editor' as const,
              cursor: data.cursor,
              name: data.name,
              email: data.email,
              activeNodeId: data.activeNodeId,
              isTyping: data.isTyping,
              lastActivity: data.lastActivity,
              color: COLORS[i % COLORS.length],
            }
          })
        setCollaborators(collabs)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            name: currentUserName,
            email: currentUserEmail,
            activeNodeId: selectedNodeId,
            isTyping: false,
            lastActivity: Date.now(),
          })
        }
      })

    const canvasEl = canvasRef.current
    let lastTrack = 0
    const THROTTLE_MS = 50 // Throttle cursor updates

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasEl) return
      const now = Date.now()
      if (now - lastTrack < THROTTLE_MS) return
      lastTrack = now

      const rect = canvasEl.getBoundingClientRect()
      channel.track({
        cursor: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        name: currentUserName,
        email: currentUserEmail,
        activeNodeId: selectedNodeId,
        isTyping: false,
        lastActivity: now,
      })
    }

    canvasEl?.addEventListener('mousemove', handleMouseMove)
    return () => {
      canvasEl?.removeEventListener('mousemove', handleMouseMove)
      presenceChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [project.id, supabase, currentUserId, currentUserName, currentUserEmail])

  // Update presence when selected node changes
  useEffect(() => {
    if (presenceChannelRef.current && currentUserId) {
      presenceChannelRef.current.track({
        name: currentUserName,
        email: currentUserEmail,
        activeNodeId: selectedNodeId,
        isTyping: false,
        lastActivity: Date.now(),
      })
    }
  }, [selectedNodeId, currentUserName, currentUserEmail, currentUserId])

  // Broadcast typing state
  const broadcastTyping = (isTyping: boolean) => {
    if (presenceChannelRef.current && currentUserId) {
      presenceChannelRef.current.track({
        name: currentUserName,
        email: currentUserEmail,
        activeNodeId: selectedNodeId,
        isTyping,
        lastActivity: Date.now(),
      })
    }
  }

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

  // Resolve conflict with AI assistance
  async function resolveConflictWithAI(conflictNodeId: string): Promise<{ title: string; body: string; rationale: string } | null> {
    const conflictNode = nodes.find(n => n.id === conflictNodeId)
    if (!conflictNode || conflictNode.type !== 'conflict') return null

    try {
      const conflictData = JSON.parse(conflictNode.body || '{}')

      const res = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictNodeId,
          originalContent: conflictData.originalEdit?.content,
          conflictingContent: conflictData.conflictingEdit?.content,
          originalEditor: conflictData.originalEdit?.userName,
          conflictingEditor: conflictData.conflictingEdit?.userName,
        }),
      })

      if (!res.ok) {
        console.error('AI resolution failed')
        return null
      }

      const data = await res.json()
      return data.resolution
    } catch (err) {
      console.error('Failed to resolve conflict with AI:', err)
      return null
    }
  }

  // Apply AI resolution to the original node
  async function applyConflictResolution(
    conflictNodeId: string,
    resolution: { title: string; body: string; rationale: string }
  ) {
    const conflictNode = nodes.find(n => n.id === conflictNodeId)
    if (!conflictNode) return

    try {
      const conflictData = JSON.parse(conflictNode.body || '{}')
      const sourceNodeId = conflictData.sourceNodeId

      if (sourceNodeId) {
        // Update the original node with the resolved content
        await supabase
          .from('canvas_nodes')
          .update({
            title: resolution.title,
            body: resolution.body,
          })
          .eq('id', sourceNodeId)

        setNodes(prev =>
          prev.map(n =>
            n.id === sourceNodeId
              ? { ...n, title: resolution.title, body: resolution.body }
              : n
          )
        )
      }

      // Mark the conflict as resolved
      await resolveConflict(conflictNodeId, resolution.rationale)
      setNodes(prev =>
        prev.map(n =>
          n.id === conflictNodeId
            ? { ...n, status: 'resolved' as const, resolution: resolution.rationale }
            : n
        )
      )
    } catch (err) {
      console.error('Failed to apply resolution:', err)
    }
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

  async function deleteNode(nodeId: string) {
    // First delete any edges connected to this node
    const connectedEdges = edges.filter(e => e.source_id === nodeId || e.target_id === nodeId)
    for (const edge of connectedEdges) {
      await supabase.from('canvas_edges').delete().eq('id', edge.id)
    }
    setEdges(prev => prev.filter(e => e.source_id !== nodeId && e.target_id !== nodeId))

    // Then delete the node
    await supabase.from('canvas_nodes').delete().eq('id', nodeId)
    setNodes(prev => prev.filter(n => n.id !== nodeId))

    if (selectedNodeId === nodeId) setSelectedNodeId(null)
    if (evidenceNodeId === nodeId) setEvidenceNodeId(null)
  }

  async function updateNodeContent(nodeId: string, updates: { title?: string; body?: string }) {
    const { data, error } = await supabase
      .from('canvas_nodes')
      .update(updates)
      .eq('id', nodeId)
      .select()
      .single()

    if (!error && data) {
      setNodes(prev => prev.map(n => n.id === nodeId ? data as CanvasNode : n))

      // Track this edit for conflict detection
      if (currentUserId) {
        const node = nodes.find(n => n.id === nodeId)
        if (node) {
          editTrackerRef.current.set(nodeId, {
            userId: currentUserId,
            userName: currentUserName || 'You',
            timestamp: Date.now(),
            content: {
              title: updates.title ?? node.title,
              body: updates.body ?? node.body,
            },
          })
        }
      }
    }
  }

  // Create a conflict node when simultaneous edits are detected
  const createConflictNode = useCallback(async (
    originalNode: CanvasNode,
    originalEdit: EditRecord,
    conflictingUserId: string,
    conflictingUserName: string,
    conflictingContent: { title: string; body?: string }
  ) => {
    // Don't create conflict if the same user is editing
    if (originalEdit.userId === conflictingUserId) return

    // Check if a conflict for this node already exists and is unresolved
    const existingConflict = nodes.find(
      n => n.type === 'conflict' &&
           n.status === 'open' &&
           n.body?.includes(originalNode.id)
    )
    if (existingConflict) return

    const conflictBody = JSON.stringify({
      sourceNodeId: originalNode.id,
      sourceNodeTitle: originalNode.title,
      originalEdit: {
        userId: originalEdit.userId,
        userName: originalEdit.userName,
        content: originalEdit.content,
        timestamp: originalEdit.timestamp,
      },
      conflictingEdit: {
        userId: conflictingUserId,
        userName: conflictingUserName,
        content: conflictingContent,
        timestamp: Date.now(),
      },
    })

    const { data: conflictNode } = await supabase
      .from('canvas_nodes')
      .insert({
        project_id: project.id,
        type: 'conflict',
        title: `Conflict: ${originalNode.title}`,
        body: conflictBody,
        status: 'open',
        position: {
          x: originalNode.position.x + 240,
          y: originalNode.position.y,
        },
        evidence: [],
      })
      .select()
      .single()

    if (conflictNode) {
      setNodes(prev =>
        prev.some(n => n.id === conflictNode.id) ? prev : [...prev, conflictNode as CanvasNode]
      )

      // Create an edge from original to conflict
      await fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          source_id: originalNode.id,
          target_id: conflictNode.id,
        }),
      })
    }
  }, [nodes, project.id, supabase])

  // Edge creation handlers
  function handleStartEdge(nodeId: string, side: 'left' | 'right') {
    setConnectingFrom({ nodeId, side })
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }

  async function handleEndEdge(targetNodeId: string) {
    if (!connectingFrom || connectingFrom.nodeId === targetNodeId) {
      setConnectingFrom(null)
      setMousePos(null)
      return
    }

    try {
      const res = await fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          source_id: connectingFrom.nodeId,
          target_id: targetNodeId,
        }),
      })

      if (res.ok) {
        const newEdge = await res.json()
        setEdges(prev =>
          prev.some(e => e.id === newEdge.id) ? prev : [...prev, newEdge]
        )
      }
    } catch (err) {
      console.error('Failed to create edge:', err)
    }

    setConnectingFrom(null)
    setMousePos(null)
  }

  async function deleteSelectedEdge() {
    if (!selectedEdgeId) return

    try {
      await fetch(`/api/edges?id=${selectedEdgeId}`, { method: 'DELETE' })
      setEdges(prev => prev.filter(e => e.id !== selectedEdgeId))
      setSelectedEdgeId(null)
    } catch (err) {
      console.error('Failed to delete edge:', err)
    }
  }

  // Handle keyboard events for edge/node deletion
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle delete if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        e.preventDefault()
        deleteSelectedEdge()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !selectedEdgeId) {
        e.preventDefault()
        deleteNode(selectedNodeId)
      }
      if (e.key === 'Escape') {
        setConnectingFrom(null)
        setMousePos(null)
        setSelectedEdgeId(null)
        setSelectedNodeId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEdgeId, selectedNodeId])

  // Track mouse position during edge creation
  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (connectingFrom && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  function handleCanvasClick() {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    if (connectingFrom) {
      setConnectingFrom(null)
      setMousePos(null)
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
        onDecisionAdded={(decision) => setDecisions(prev => [decision, ...prev])}
        currentUserId={currentUserId || undefined}
        canEdit={permissions.canEdit}
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

          {/* View only badge for viewers */}
          {permissions.isViewer && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Eye className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-medium text-amber-400">View only</span>
            </div>
          )}

          {/* Invite button - owner only */}
          {permissions.canInvite && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium text-zinc-400 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-colors"
              title="Invite collaborators"
            >
              <UserPlus className="w-3 h-3" />
              Invite
            </button>
          )}

          {/* Add node button - editors and owners only */}
          {permissions.canEdit && (
            <button
              onClick={addNode}
              className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium text-zinc-400 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add node
            </button>
          )}

          {/* Edge selected indicator - delete only for editors */}
          {selectedEdgeId && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/30">
              <span className="text-[11px] text-violet-300">Edge selected</span>
              {permissions.canDelete && (
                <button
                  onClick={deleteSelectedEdge}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}

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
              cursor: connectingFrom ? 'crosshair' : 'default',
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
          >
            {/* SVG connectors */}
            <svg className="absolute inset-0 w-full h-full">
              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.source_id)
                const tgt = nodes.find(n => n.id === edge.target_id)
                if (!src || !tgt) return null
                const isSelected = selectedEdgeId === edge.id
                return (
                  <g key={edge.id}>
                    {/* Invisible wider line for easier clicking */}
                    <line
                      x1={src.position.x + 210} y1={src.position.y + 50}
                      x2={tgt.position.x} y2={tgt.position.y + 50}
                      stroke="transparent"
                      strokeWidth="12"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEdgeId(edge.id)
                        setSelectedNodeId(null)
                      }}
                    />
                    {/* Visible edge line */}
                    <line
                      x1={src.position.x + 210} y1={src.position.y + 50}
                      x2={tgt.position.x} y2={tgt.position.y + 50}
                      stroke={isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={isSelected ? 2 : 1.5}
                      strokeDasharray={isSelected ? 'none' : '5 4'}
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Arrow at target */}
                    <polygon
                      points={`${tgt.position.x},${tgt.position.y + 50} ${tgt.position.x - 8},${tgt.position.y + 46} ${tgt.position.x - 8},${tgt.position.y + 54}`}
                      fill={isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                )
              })}

              {/* Preview line during edge creation */}
              {connectingFrom && mousePos && (() => {
                const srcNode = nodes.find(n => n.id === connectingFrom.nodeId)
                if (!srcNode) return null
                const startX = connectingFrom.side === 'right' ? srcNode.position.x + 210 : srcNode.position.x
                const startY = srcNode.position.y + 50
                return (
                  <line
                    x1={startX} y1={startY}
                    x2={mousePos.x} y2={mousePos.y}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <SpecNode
                key={node.id}
                node={node}
                selected={selectedNodeId === node.id}
                onSelect={(id) => { setSelectedNodeId(id); setSelectedEdgeId(null) }}
                onMove={permissions.canEdit ? (pos) => updateNodePosition(node.id, pos) : undefined}
                onResolve={permissions.canEdit ? (res) => resolveConflict(node.id, res) : undefined}
                onOpenEvidence={(id) => { setEvidenceNodeId(id); setSelectedNodeId(id) }}
                onStartEdge={permissions.canEdit ? handleStartEdge : undefined}
                onEndEdge={permissions.canEdit ? handleEndEdge : undefined}
                isConnecting={connectingFrom !== null && connectingFrom.nodeId !== node.id}
                onDelete={permissions.canDelete ? deleteNode : undefined}
                onUpdate={permissions.canEdit ? updateNodeContent : undefined}
                viewingCollaborators={collaborators}
                onResolveWithAI={permissions.canEdit ? resolveConflictWithAI : undefined}
                onApplyResolution={permissions.canEdit ? applyConflictResolution : undefined}
                readOnly={!permissions.canEdit}
              />
            ))}

            {/* Live cursors */}
            <CollabCursors collaborators={collaborators} />

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

          {/* Evidence drawer */}
          {evidenceNode && (
            <EvidenceDrawer
              node={evidenceNode}
              onClose={() => setEvidenceNodeId(null)}
              onNodeUpdate={(updated) => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))}
            />
          )}

          {/* Chat panel */}
          {selectedNode && (
            <ChatPanel
              node={selectedNode}
              project={project}
              onClose={() => setSelectedNodeId(null)}
              onNodeUpdate={permissions.canEdit ? (updated) => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n)) : undefined}
              onOpenEvidence={() => setEvidenceNodeId(selectedNode.id)}
              collaborators={collaborators}
              onTypingChange={broadcastTyping}
              readOnly={!permissions.canChat}
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

      {/* Invite dialog */}
      {showInvite && (
        <InviteDialog
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}
