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
    <div className="absolute right-80 top-12 bottom-0 w-72 bg-background border-l flex flex-col z-20">
      <div className="p-3 border-b flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Evidence</h3>
          <p className="text-xs text-muted-foreground">{node.evidence.length} attached</p>
        </div>
        <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {/* Evidence list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {node.evidence.map((ev, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-1.5">
            <p className="text-xs italic leading-relaxed">&ldquo;{ev.quote}&rdquo;</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{ev.source}</span>
              {ev.url && (
                <a href={ev.url} target="_blank" rel="noopener noreferrer" className="ml-auto">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {node.evidence.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No evidence attached</p>
        )}
      </div>

      {/* Add evidence form */}
      <div className="p-3 border-t space-y-2">
        <p className="text-xs font-medium">Add evidence</p>
        <textarea
          placeholder="Quote or paraphrase..."
          value={quote}
          onChange={e => setQuote(e.target.value)}
          className="w-full text-xs border rounded-lg px-2.5 py-2 bg-background resize-none h-16 focus:outline-none focus:border-purple-400"
        />
        <input
          placeholder="Source (e.g. Reddit, HN)"
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full text-xs border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:border-purple-400"
        />
        <input
          placeholder="URL (optional)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full text-xs border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:border-purple-400"
        />
        <Button size="sm" className="w-full" onClick={addEvidence} disabled={adding || !quote.trim() || !source.trim()}>
          Add evidence
        </Button>
      </div>
    </div>
  )
}
