'use client'
import { useRef, useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import type { CanvasNode } from '@/types'

interface Props {
  node: CanvasNode
  selected: boolean
  onSelect: (id: string) => void
  onMove: (pos: { x: number; y: number }) => void
  onResolve: (resolution: string) => void
  onOpenEvidence?: (nodeId: string) => void
  onStartEdge?: (nodeId: string, side: 'left' | 'right') => void
  onEndEdge?: (nodeId: string) => void
  isConnecting?: boolean
  onDelete?: (nodeId: string) => void
  onUpdate?: (nodeId: string, updates: { title?: string; body?: string }) => void
}

const typeConfig: Record<string, { dot: string; badgeBg: string; badgeText: string; label: string; border: string; selectedBorder: string }> = {
  pain_point: { dot: '#f87171', badgeBg: 'rgba(239,68,68,0.15)', badgeText: '#fca5a5', label: 'Pain point', border: 'rgba(239,68,68,0.2)', selectedBorder: 'rgba(239,68,68,0.6)' },
  feature:    { dot: '#34d399', badgeBg: 'rgba(16,185,129,0.15)', badgeText: '#6ee7b7', label: 'Feature', border: 'rgba(16,185,129,0.2)', selectedBorder: 'rgba(16,185,129,0.6)' },
  ui_change:  { dot: '#c084fc', badgeBg: 'rgba(168,85,247,0.15)', badgeText: '#d8b4fe', label: 'UI change', border: 'rgba(168,85,247,0.2)', selectedBorder: 'rgba(168,85,247,0.6)' },
  data_model: { dot: '#60a5fa', badgeBg: 'rgba(59,130,246,0.15)', badgeText: '#93c5fd', label: 'Data model', border: 'rgba(59,130,246,0.2)', selectedBorder: 'rgba(59,130,246,0.6)' },
  dev_task:   { dot: '#fbbf24', badgeBg: 'rgba(245,158,11,0.15)', badgeText: '#fde68a', label: 'Dev task', border: 'rgba(245,158,11,0.2)', selectedBorder: 'rgba(245,158,11,0.6)' },
  conflict:   { dot: '#f87171', badgeBg: 'rgba(239,68,68,0.15)', badgeText: '#fca5a5', label: 'Conflict', border: 'rgba(239,68,68,0.3)', selectedBorder: 'rgba(239,68,68,0.7)' },
  decision:   { dot: '#a78bfa', badgeBg: 'rgba(139,92,246,0.15)', badgeText: '#c4b5fd', label: 'Decision', border: 'rgba(139,92,246,0.2)', selectedBorder: 'rgba(139,92,246,0.6)' },
  evidence:   { dot: '#9ca3af', badgeBg: 'rgba(156,163,175,0.12)', badgeText: '#d1d5db', label: 'Evidence', border: 'rgba(156,163,175,0.15)', selectedBorder: 'rgba(156,163,175,0.5)' },
}

export function SpecNode({ node, selected, onSelect, onMove, onResolve, onOpenEvidence, onStartEdge, onEndEdge, isConnecting, onDelete, onUpdate }: Props) {
  const dragStart = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null)
  const didDrag = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [localPos, setLocalPos] = useState(node.position)

  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingBody, setIsEditingBody] = useState(false)
  const [editTitle, setEditTitle] = useState(node.title)
  const [editBody, setEditBody] = useState(node.body || '')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const bodyInputRef = useRef<HTMLTextAreaElement>(null)

  // Sync local state when node changes externally
  useEffect(() => {
    if (!isEditingTitle) setEditTitle(node.title)
    if (!isEditingBody) setEditBody(node.body || '')
  }, [node.title, node.body, isEditingTitle, isEditingBody])

  // Focus inputs when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingBody && bodyInputRef.current) {
      bodyInputRef.current.focus()
      bodyInputRef.current.select()
    }
  }, [isEditingBody])

  const cfg = typeConfig[node.type] || typeConfig.feature

  function handleTitleSave() {
    if (editTitle.trim() && editTitle !== node.title && onUpdate) {
      onUpdate(node.id, { title: editTitle.trim() })
    } else {
      setEditTitle(node.title)
    }
    setIsEditingTitle(false)
  }

  function handleBodySave() {
    if (editBody !== node.body && onUpdate) {
      onUpdate(node.id, { body: editBody.trim() || undefined })
    } else {
      setEditBody(node.body || '')
    }
    setIsEditingBody(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditTitle(node.title)
      setIsEditingTitle(false)
    }
  }

  function handleBodyKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setEditBody(node.body || '')
      setIsEditingBody(false)
    }
    // Allow Enter for newlines in body, use Cmd/Ctrl+Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleBodySave()
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    didDrag.current = false
    dragStart.current = { x: e.clientX, y: e.clientY, nodeX: localPos.x, nodeY: localPos.y }
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true
    setLocalPos({ x: dragStart.current.nodeX + dx, y: dragStart.current.nodeY + dy })
  }

  function onPointerUp(e: React.PointerEvent) {
    e.stopPropagation()
    if (!dragStart.current) return
    dragStart.current = null
    setIsDragging(false)
    if (!didDrag.current) {
      onSelect(node.id)
    } else {
      onMove(localPos)
    }
    didDrag.current = false
  }

  return (
    <div
      className={`absolute select-none rounded-2xl p-3.5 w-[210px] cursor-pointer transition-all duration-150 ${
        isDragging ? 'z-20 scale-[1.03]' : 'z-10'
      }`}
      style={{
        left: localPos.x,
        top: localPos.y,
        background: selected ? '#1c1d2a' : '#161720',
        border: `1px solid ${selected ? cfg.selectedBorder : cfg.border}`,
        boxShadow: selected
          ? `0 0 0 1px ${cfg.selectedBorder}, 0 8px 32px rgba(0,0,0,0.4)`
          : isDragging
          ? '0 16px 40px rgba(0,0,0,0.5)'
          : '0 2px 12px rgba(0,0,0,0.3)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      // Prevent canvas onClick from firing when clicking a node
      onClick={(e) => e.stopPropagation()}
    >
      {/* Type badge row */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: cfg.dot }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
          style={{ background: cfg.badgeBg, color: cfg.badgeText }}
        >
          {cfg.label}
        </span>
        {node.type === 'conflict' && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        )}

        {/* Actions row */}
        <div className="ml-auto flex items-center gap-1">
          {onOpenEvidence && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenEvidence(node.id) }}
              className="text-[10px] rounded px-1 py-0.5 transition-colors"
              style={{ color: 'rgba(161,161,170,0.7)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(228,228,231,0.9)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(161,161,170,0.7)'; e.currentTarget.style.background = 'transparent' }}
              title="Open evidence"
            >
              {node.evidence.length} ev
            </button>
          )}
          {!onOpenEvidence && node.evidence.length > 0 && (
            <span className="text-[10px] text-zinc-600">{node.evidence.length} ev</span>
          )}
          {onDelete && selected && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
              className="p-1 rounded transition-colors hover:bg-red-500/20"
              style={{ color: 'rgba(248,113,113,0.7)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.7)' }}
              title="Delete node"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Title - double-click to edit */}
      {isEditingTitle ? (
        <input
          ref={titleInputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleTitleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-[13px] font-semibold leading-snug text-zinc-100 mb-1.5 bg-white/5 border border-white/20 rounded px-1.5 py-0.5 outline-none focus:border-violet-500"
          placeholder="Enter title..."
        />
      ) : (
        <p
          className="text-[13px] font-semibold leading-snug text-zinc-100 mb-1.5 cursor-text hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (onUpdate) setIsEditingTitle(true)
          }}
          title="Double-click to edit"
        >
          {node.title}
        </p>
      )}

      {/* Body - double-click to edit */}
      {isEditingBody ? (
        <textarea
          ref={bodyInputRef}
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          onBlur={handleBodySave}
          onKeyDown={handleBodyKeyDown}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-[12px] text-zinc-400 leading-relaxed bg-white/5 border border-white/20 rounded px-1.5 py-1 outline-none focus:border-violet-500 resize-none min-h-[48px]"
          placeholder="Enter description... (Ctrl/Cmd+Enter to save)"
          rows={2}
        />
      ) : (
        <p
          className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2 cursor-text hover:bg-white/5 rounded px-1 -mx-1 py-0.5 transition-colors min-h-[20px]"
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (onUpdate) setIsEditingBody(true)
          }}
          title="Double-click to edit"
        >
          {node.body || <span className="text-zinc-600 italic">Add description...</span>}
        </p>
      )}

      {/* Status chip */}
      {node.status !== 'open' && (
        <div className="mt-2.5 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className={`text-[11px] font-medium capitalize ${
            node.status === 'resolved' || node.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {node.status}
          </span>
        </div>
      )}

      {/* Connection handles */}
      {onStartEdge && (
        <>
          {/* Left handle */}
          <div
            className="absolute top-1/2 -left-2 w-4 h-4 -translate-y-1/2 flex items-center justify-center cursor-crosshair group"
            onPointerDown={(e) => {
              e.stopPropagation()
              onStartEdge(node.id, 'left')
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-all group-hover:scale-125"
              style={{
                background: isConnecting ? cfg.dot : 'rgba(255,255,255,0.15)',
                border: `2px solid ${cfg.dot}`,
                boxShadow: isConnecting ? `0 0 8px ${cfg.dot}` : 'none',
              }}
            />
          </div>
          {/* Right handle */}
          <div
            className="absolute top-1/2 -right-2 w-4 h-4 -translate-y-1/2 flex items-center justify-center cursor-crosshair group"
            onPointerDown={(e) => {
              e.stopPropagation()
              onStartEdge(node.id, 'right')
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-all group-hover:scale-125"
              style={{
                background: isConnecting ? cfg.dot : 'rgba(255,255,255,0.15)',
                border: `2px solid ${cfg.dot}`,
                boxShadow: isConnecting ? `0 0 8px ${cfg.dot}` : 'none',
              }}
            />
          </div>
        </>
      )}

      {/* Drop target overlay when connecting */}
      {isConnecting && onEndEdge && (
        <div
          className="absolute inset-0 rounded-2xl z-30"
          style={{
            background: 'rgba(124,58,237,0.1)',
            border: '2px dashed rgba(124,58,237,0.5)',
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            onEndEdge(node.id)
          }}
        />
      )}
    </div>
  )
}
