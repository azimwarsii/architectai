'use client'
import { useChat, type Message } from 'ai/react'
import { useEffect, useRef } from 'react'
import type { CanvasNode, Project, AISuggestion } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { X, ArrowUp, FileText } from 'lucide-react'

interface Props {
  node: CanvasNode
  project: Project
  onClose: () => void
  onNodeUpdate: (node: CanvasNode) => void
  onOpenEvidence?: () => void
}

const nodeTypeColor: Record<string, string> = {
  pain_point: '#f87171',
  feature:    '#34d399',
  ui_change:  '#c084fc',
  data_model: '#60a5fa',
  dev_task:   '#fbbf24',
  conflict:   '#f87171',
  decision:   '#a78bfa',
  evidence:   '#9ca3af',
}

export function ChatPanel({ node, project, onClose, onNodeUpdate, onOpenEvidence }: Props) {
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

  const dotColor = nodeTypeColor[node.type] || '#9ca3af'

  return (
    <div
      className="w-[300px] flex-shrink-0 flex flex-col h-full"
      style={{ background: '#0f1018', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#34d399' }} />
        <span className="text-[13px] font-semibold text-zinc-100 flex-1">AI assistant</span>
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

      {/* Focused node badge */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: 'rgba(161,161,170,0.5)' }}>Focused on</span>
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md flex-1 min-w-0"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <span className="text-[11px] font-medium truncate max-w-[150px]" style={{ color: dotColor }}>
              {node.title}
            </span>
          </div>
          {onOpenEvidence && (
            <button
              type="button"
              onClick={onOpenEvidence}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
              style={{ color: 'rgba(161,161,170,0.7)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(228,228,231,0.9)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(161,161,170,0.7)' }}
              title="Open evidence"
            >
              <FileText className="w-3 h-3" />
              Evidence {node.evidence.length > 0 && `(${node.evidence.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
        {messages.length === 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(161,161,170,0.5)' }}>
              Ask questions, propose changes, or resolve conflicts on this node.
            </p>
            {['What should this node contain?', 'Suggest improvements', 'Find conflicts'].map(prompt => (
              <button
                key={prompt}
                onClick={() => {
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent
                  handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>)
                }}
                className="w-full text-left text-[12px] px-3 py-2 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(228,228,231,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                {prompt}
              </button>
            ))}
          </div>
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
              <span className="text-[10px] font-semibold px-0.5" style={{ color: 'rgba(161,161,170,0.4)' }}>
                {m.role === 'user' ? 'You' : 'AI'}
              </span>
              <div
                className="text-[12.5px] leading-relaxed rounded-2xl px-3.5 py-2.5 max-w-[95%]"
                style={m.role === 'user'
                  ? { background: '#5b21b6', color: '#ede9fe', borderRadius: '16px 16px 4px 16px' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(228,228,231,0.85)', borderRadius: '16px 16px 16px 4px' }
                }
              >
                {cleanContent}
              </div>
              {suggestion && (
                <div
                  className="w-full rounded-xl p-3.5 space-y-2.5 mt-1"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-[13px] font-semibold" style={{ color: '#e4e4e7' }}>{suggestion.title}</p>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(161,161,170,0.7)' }}>{suggestion.body}</p>
                  <button
                    onClick={() => applySuggestion(suggestion)}
                    className="h-7 px-3 rounded-lg text-[12px] font-semibold transition-colors"
                    style={{ background: 'rgba(124,58,237,0.3)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.45)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.3)' }}
                  >
                    Apply to canvas
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {isLoading && (
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] font-semibold px-0.5" style={{ color: 'rgba(161,161,170,0.4)' }}>AI</span>
            <div
              className="px-3.5 py-2.5 rounded-2xl text-[12px]"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(161,161,170,0.5)' }}
            >
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 flex gap-2 items-end"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about this node…"
          className="flex-1 text-[12.5px] rounded-xl px-3.5 py-2.5 resize-none focus:outline-none transition-colors"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: '#e4e4e7',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
          style={{ background: '#7c3aed' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#6d28d9' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed' }}
        >
          <ArrowUp className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  )
}
