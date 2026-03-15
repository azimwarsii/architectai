'use client'
import { useChat, type Message } from 'ai/react'
import { useEffect, useRef } from 'react'
import type { CanvasNode, Project, AISuggestion } from '@/types'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Props {
  node: CanvasNode
  project: Project
  onClose: () => void
  onNodeUpdate: (node: CanvasNode) => void
}

export function ChatPanel({ node, project, onClose, onNodeUpdate }: Props) {
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: {
      nodeId: node.id,
      projectId: project.id,
      nodeContext: {
        type: node.type,
        title: node.title,
        body: node.body,
        evidence: node.evidence,
        specAnswers: project.spec_answers,
        tinyfishReport: project.tinyfish_report,
      },
    },
    id: node.id,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function parseSuggestion(content: string): AISuggestion | null {
    const start = content.indexOf('<suggestion>')
    const end = content.indexOf('</suggestion>')
    if (start === -1 || end === -1) return null
    try { return JSON.parse(content.slice(start + 12, end)) } catch { return null }
  }

  async function applySuggestion(suggestion: AISuggestion) {
    if (suggestion.action === 'apply_to_canvas') {
      const updated = { ...node, body: suggestion.body, updated_at: new Date().toISOString() }
      await supabase.from('canvas_nodes').update({ body: suggestion.body }).eq('id', node.id)
      onNodeUpdate(updated as CanvasNode)
    } else if (suggestion.action === 'log_decision') {
      await supabase.from('decisions').insert({
        project_id: project.id,
        node_id: node.id,
        title: suggestion.title,
        rationale: suggestion.body,
      })
    } else if (suggestion.action === 'resolve_conflict') {
      await supabase.from('canvas_nodes').update({
        status: 'resolved',
        resolution: suggestion.body,
      }).eq('id', node.id)
    }
  }

  const nodeTagColor: Record<string, string> = {
    pain_point: 'bg-teal-50 text-teal-800',
    feature: 'bg-teal-50 text-teal-800',
    ui_change: 'bg-purple-50 text-purple-800',
    data_model: 'bg-purple-50 text-purple-800',
    dev_task: 'bg-amber-50 text-amber-800',
    conflict: 'bg-red-50 text-red-800',
    decision: 'bg-purple-50 text-purple-800',
  }

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full mt-12">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-teal-500" />
        <span className="text-sm font-medium flex-1">AI — spec assistant</span>
        <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {/* Context badge */}
      <div className="px-3 py-2 border-b bg-muted/50 text-xs text-muted-foreground">
        Focused: <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ml-1 ${nodeTagColor[node.type] || ''}`}>{node.title}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Ask about this node, suggest changes, or resolve conflicts.
          </p>
        )}
        {messages.map((m: Message) => {
          const suggestion = m.role === 'assistant' ? parseSuggestion(m.content) : null
          const suggStart = m.content.indexOf('<suggestion>')
          const suggEnd = m.content.indexOf('</suggestion>') + '</suggestion>'.length
          const cleanContent = (suggStart !== -1 && suggEnd > suggStart
            ? m.content.slice(0, suggStart) + m.content.slice(suggEnd)
            : m.content).trim()

          return (
            <div key={m.id} className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-muted-foreground font-medium">
                {m.role === 'user' ? 'You' : 'AI'}
              </span>
              <div className={`text-xs leading-relaxed rounded-xl px-3 py-2 max-w-[95%] ${
                m.role === 'user'
                  ? 'bg-purple-500 text-white rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}>
                {cleanContent}
              </div>
              {suggestion && (
                <div className="border rounded-lg p-3 text-xs bg-background w-full space-y-2">
                  <p className="font-medium">{suggestion.title}</p>
                  <p className="text-muted-foreground">{suggestion.body}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                      onClick={() => applySuggestion(suggestion)}>
                      Apply to canvas
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about this node…"
          className="flex-1 text-xs border rounded-full px-3 py-2 bg-background focus:outline-none focus:border-purple-400"
        />
        <button type="submit" disabled={isLoading}
          className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 hover:bg-purple-600 transition-colors disabled:opacity-50">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6h10M6 1l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  )
}
