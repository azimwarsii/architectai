'use client'
import type { CanvasNode, Evidence } from '@/types'
import { Button } from '@/components/ui/button'
import { X, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface Props {
  node: CanvasNode
  onClose: () => void
  onNodeUpdate: (node: CanvasNode) => void
}

export function EvidenceDrawer({ node, onClose, onNodeUpdate }: Props) {
  const supabase = createClient()
  const [quote, setQuote] = useState('')
  const [source, setSource] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)

  async function addEvidence() {
    if (!quote.trim() || !source.trim()) return
    setAdding(true)
    const newEvidence: Evidence = { quote, source, url: url || undefined }
    const updatedEvidence = [...node.evidence, newEvidence]

    await supabase
      .from('canvas_nodes')
      .update({ evidence: updatedEvidence })
      .eq('id', node.id)

    onNodeUpdate({ ...node, evidence: updatedEvidence })
    setQuote('')
    setSource('')
    setUrl('')
    setAdding(false)
  }

  return (
    <div
      className="w-72 flex-shrink-0 flex flex-col h-full"
      style={{ background: '#0f1018', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <h3 className="text-sm font-medium text-zinc-100">Evidence</h3>
          <p className="text-xs" style={{ color: 'rgba(161,161,170,0.6)' }}>{node.evidence.length} attached</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'rgba(161,161,170,0.5)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(228,228,231,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(161,161,170,0.5)'; e.currentTarget.style.background = 'transparent' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Evidence list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        {node.evidence.map((ev, i) => (
          <div key={i} className="rounded-lg p-3 space-y-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs italic leading-relaxed" style={{ color: 'rgba(228,228,231,0.85)' }}>&ldquo;{ev.quote}&rdquo;</p>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(161,161,170,0.6)' }}>
              <span>{ev.source}</span>
              {ev.url && (
                <a href={ev.url} target="_blank" rel="noopener noreferrer" className="ml-auto" style={{ color: 'rgba(161,161,170,0.7)' }}>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {node.evidence.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'rgba(161,161,170,0.4)' }}>No evidence attached</p>
        )}
      </div>

      {/* Add evidence form */}
      <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-medium" style={{ color: 'rgba(228,228,231,0.8)' }}>Add evidence</p>
        <textarea
          placeholder="Quote or paraphrase..."
          value={quote}
          onChange={e => setQuote(e.target.value)}
          className="w-full text-xs rounded-lg px-2.5 py-2 resize-none h-16 focus:outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#e4e4e7' }}
        />
        <input
          placeholder="Source (e.g. Reddit, HN)"
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#e4e4e7' }}
        />
        <input
          placeholder="URL (optional)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#e4e4e7' }}
        />
        <Button size="sm" className="w-full" onClick={addEvidence} disabled={adding || !quote.trim() || !source.trim()}>
          Add evidence
        </Button>
      </div>
    </div>
  )
}
