'use client'
import { useRef, useState } from 'react'
import type { CanvasNode } from '@/types'

interface Props {
  node: CanvasNode
  selected: boolean
  onSelect: () => void
  onMove: (pos: { x: number; y: number }) => void
  onResolve: (resolution: string) => void
}

const typeConfig: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  pain_point: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Pain point' },
  feature: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700', label: 'Feature' },
  ui_change: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', label: 'UI change' },
  data_model: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', label: 'Data model' },
  dev_task: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Dev task' },
  conflict: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700', label: 'Conflict' },
  decision: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', label: 'Decision' },
  evidence: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700', label: 'Evidence' },
}

export function SpecNode({ node, selected, onSelect, onMove, onResolve }: Props) {
  const dragStart = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [localPos, setLocalPos] = useState(node.position)

  const cfg = typeConfig[node.type] || typeConfig.feature

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    onSelect()
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: localPos.x,
      nodeY: localPos.y,
    }
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setLocalPos({
      x: dragStart.current.nodeX + dx,
      y: dragStart.current.nodeY + dy,
    })
  }

  function onPointerUp() {
    if (!dragStart.current) return
    dragStart.current = null
    setIsDragging(false)
    onMove(localPos)
  }

  return (
    <div
      className={`absolute select-none rounded-xl border-2 p-3 w-52 cursor-pointer shadow-sm transition-shadow ${cfg.bg} ${
        selected ? 'border-purple-500 shadow-md' : cfg.border
      } ${isDragging ? 'shadow-lg z-10' : ''}`}
      style={{ left: localPos.x, top: localPos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${cfg.badge}`}>
          {cfg.label}
        </span>
        {node.type === 'conflict' && (
          <span className="w-2 h-2 rounded-full bg-red-500 ml-auto animate-pulse" />
        )}
        {node.evidence.length > 0 && (
          <span className="text-[10px] text-muted-foreground ml-auto">{node.evidence.length} evidence</span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug mb-1">{node.title}</p>

      {/* Body preview */}
      {node.body && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{node.body}</p>
      )}

      {/* Status */}
      {node.status !== 'open' && (
        <div className="mt-2 pt-2 border-t border-current border-opacity-10">
          <span className={`text-[10px] font-medium capitalize ${
            node.status === 'resolved' ? 'text-teal-600' :
            node.status === 'approved' ? 'text-teal-700' :
            'text-amber-600'
          }`}>
            {node.status}
          </span>
        </div>
      )}
    </div>
  )
}
