'use client'
import { useRef, useState } from 'react'
import type { CanvasNode } from '@/types'

interface Props {
  node: CanvasNode
  selected: boolean
  onSelect: (id: string) => void
  onMove: (pos: { x: number; y: number }) => void
  onResolve: (resolution: string) => void
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

export function SpecNode({ node, selected, onSelect, onMove, onResolve }: Props) {
  const dragStart = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null)
  const didDrag = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [localPos, setLocalPos] = useState(node.position)

  const cfg = typeConfig[node.type] || typeConfig.feature

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
        {node.evidence.length > 0 && (
          <span className="ml-auto text-[10px] text-zinc-600">{node.evidence.length} ev</span>
        )}
      </div>

      {/* Title */}
      <p className="text-[13px] font-semibold leading-snug text-zinc-100 mb-1.5">{node.title}</p>

      {/* Body */}
      {node.body && (
        <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">{node.body}</p>
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
    </div>
  )
}
