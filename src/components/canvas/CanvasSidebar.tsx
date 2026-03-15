'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { CanvasNode, Decision, Evidence } from '@/types'

interface Props {
  projectId: string
  projectName: string
  nodes: CanvasNode[]
  decisions: Decision[]
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
}

const TYPE_COLOR: Record<string, string> = {
  pain_point: '#f87171',
  feature:    '#34d399',
  ui_change:  '#c084fc',
  data_model: '#60a5fa',
  dev_task:   '#fbbf24',
  conflict:   '#f87171',
  decision:   '#a78bfa',
  evidence:   '#9ca3af',
}

const TYPE_LABEL: Record<string, string> = {
  pain_point: 'Pain',
  feature:    'Feature',
  ui_change:  'UI',
  data_model: 'Data',
  dev_task:   'Task',
  conflict:   'Conflict',
  decision:   'Decision',
  evidence:   'Evidence',
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: 'rgba(161,161,170,0.6)' }}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[11px] font-medium tabular-nums" style={{ color: 'rgba(161,161,170,0.4)' }}>{count}</span>
      )}
    </div>
  )
}

export function CanvasSidebar({ projectId, projectName, nodes, decisions, selectedNodeId, onSelectNode }: Props) {
  const allEvidence: Array<Evidence & { nodeTitle: string }> = nodes.flatMap(n =>
    n.evidence.map(e => ({ ...e, nodeTitle: n.title }))
  )
  const conflictCount = nodes.filter(n => n.type === 'conflict').length

  return (
    <div
      className="w-[248px] flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background: '#0f1018', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-4 transition-colors"
          style={{ color: 'rgba(161,161,170,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(161,161,170,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(161,161,170,0.5)')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>

        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            <span className="text-white text-[10px] font-bold">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-100 truncate">{projectName}</p>
            <p className="text-[11px]" style={{ color: 'rgba(161,161,170,0.5)' }}>Spec canvas</p>
          </div>
        </div>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

        {/* SPEC NODES */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: 'rgba(161,161,170,0.6)' }}>
              Spec nodes
            </span>
            <div className="flex items-center gap-1.5">
              {conflictCount > 0 && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                >
                  {conflictCount} conflict
                </span>
              )}
              <span className="text-[11px] tabular-nums" style={{ color: 'rgba(161,161,170,0.4)' }}>
                {nodes.length}
              </span>
            </div>
          </div>

          {nodes.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'rgba(161,161,170,0.35)' }}>No nodes yet</p>
          ) : (
            <div className="space-y-0.5">
              {nodes.map(node => {
                const isSelected = selectedNodeId === node.id
                return (
                  <button
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-100 group"
                    style={{
                      background: isSelected ? 'rgba(255,255,255,0.07)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TYPE_COLOR[node.type] || '#9ca3af' }}
                    />
                    <span
                      className="text-[12.5px] font-medium truncate flex-1"
                      style={{ color: isSelected ? '#e4e4e7' : 'rgba(228,228,231,0.7)' }}
                    >
                      {node.title}
                    </span>
                    <span
                      className="text-[10px] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'rgba(161,161,170,0.5)' }}
                    >
                      {TYPE_LABEL[node.type] || node.type}
                    </span>
                    {node.type === 'conflict' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* EVIDENCE */}
        <div
          className="px-4 pt-4 pb-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <SectionHeader label="Evidence" count={allEvidence.length} />

          {allEvidence.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'rgba(161,161,170,0.35)' }}>No evidence attached yet</p>
          ) : (
            <div className="space-y-3">
              {allEvidence.slice(0, 5).map((e, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-[12px] leading-snug line-clamp-2" style={{ color: 'rgba(228,228,231,0.65)' }}>
                    "{e.quote}"
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(161,161,170,0.4)' }}>
                    {e.source} · {e.nodeTitle}
                  </p>
                </div>
              ))}
              {allEvidence.length > 5 && (
                <p className="text-[11px]" style={{ color: 'rgba(161,161,170,0.35)' }}>
                  +{allEvidence.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* DECISIONS LOG */}
        <div
          className="px-4 pt-4 pb-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <SectionHeader label="Decisions log" count={decisions.length} />

          {decisions.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'rgba(161,161,170,0.35)' }}>No decisions logged yet</p>
          ) : (
            <div className="space-y-2.5">
              {decisions.slice(0, 8).map(d => (
                <div key={d.id} className="flex items-start gap-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0"
                    style={{
                      backgroundColor:
                        d.status === 'approved' ? '#34d399' :
                        d.status === 'rejected' ? '#f87171' :
                        '#fbbf24',
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium leading-snug" style={{ color: 'rgba(228,228,231,0.75)' }}>
                      {d.title}
                    </p>
                    {d.rationale && (
                      <p className="text-[11px] leading-snug line-clamp-1 mt-0.5" style={{ color: 'rgba(161,161,170,0.45)' }}>
                        {d.rationale}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
