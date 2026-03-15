'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONS } from '@/lib/questions'
import type { SpecAnswers } from '@/types'
import { SingleSelect } from './SingleSelect'
import { MultiSelect } from './MultiSelect'
import { SpecSummary } from './SpecSummary'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Sparkles } from 'lucide-react'

interface Props {
  projectId: string
  tinyfishReport?: object
}

interface Message { role: 'ai' | 'user'; text: string }

export function QuestionEngine({ projectId, tinyfishReport }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const chatRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [answers, setAnswers] = useState<SpecAnswers>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeQuestions = QUESTIONS.filter(q => !q.skipIf?.(answers))
  const currentQuestion = activeQuestions[stepIndex]
  const progress = currentQuestion ? currentQuestion.progressPct : 100

  // Init — ref guard prevents double-fire in React Strict Mode
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const intro = "Your idea's been validated. Before we spec it out — how much control do you want over the tech?\n\nThis shapes everything: the stack I recommend, the questions I ask, and how tasks get handed to your coding agent."
    setMessages([{ role: 'ai', text: intro }])
    setTimeout(() => {
      if (QUESTIONS[0]) {
        setMessages(prev => [...prev, { role: 'ai', text: QUESTIONS[0].message }])
      }
    }, 700)
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function addMessage(role: 'ai' | 'user', text: string) {
    setMessages(prev => [...prev, { role, text }])
  }

  async function handleAnswer(answer: string | string[]) {
    const q = activeQuestions[stepIndex]
    if (!q) return

    const displayAnswer = Array.isArray(answer) ? answer.join(', ') : answer
    addMessage('user', displayAnswer)

    const newAnswers = { ...answers, [q.id]: answer }
    setAnswers(newAnswers)

    const followUp = q.followUp?.(answer, newAnswers)
    if (followUp) {
      await new Promise(r => setTimeout(r, 400))
      addMessage('ai', followUp)
      await new Promise(r => setTimeout(r, 500))
    }

    const nextIndex = stepIndex + 1
    const nextQuestions = QUESTIONS.filter(q => !q.skipIf?.(newAnswers))
    const nextQ = nextQuestions[nextIndex]

    if (!nextQ) {
      await finalise(newAnswers)
    } else {
      await new Promise(r => setTimeout(r, followUp ? 200 : 350))
      addMessage('ai', nextQ.message)
      setStepIndex(nextIndex)
    }
  }

  async function finalise(finalAnswers: SpecAnswers) {
    setLoading(true)
    addMessage('ai', "That's everything. Generating your full spec — stack recommendation, page architecture, and agent-ready tasks…")

    await supabase
      .from('projects')
      .update({ spec_answers: finalAnswers, status: 'canvas' })
      .eq('id', projectId)

    await fetch('/api/ai/spec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, answers: finalAnswers }),
    })

    setLoading(false)
    setDone(true)
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'var(--font-host-grotesk), ui-sans-serif, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 h-12"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: '#F5E642', border: '1.5px solid #000', boxShadow: '2px 2px 0 0 #000' }}
          >
            <Sparkles className="w-3 h-3 text-black" />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Spec builder
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-black/40" style={{ fontFamily: 'var(--font-geist-mono)' }}>
            {done ? 'Complete' : `${stepIndex + 1} / ${activeQuestions.length}`}
          </span>
          <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: '#F4520E' }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{ background: '#F5F5F3', border: '1.5px solid rgba(0,0,0,0.08)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-black/30" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-black/30" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-black/30" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {done && <SpecSummary answers={answers} />}
      </div>

      {/* Answer options */}
      {!done && currentQuestion && (
        <div
          className="flex-shrink-0 px-6 py-4"
          style={{ borderTop: '1.5px solid rgba(0,0,0,0.07)', background: '#FAFAF8' }}
        >
          {currentQuestion.type === 'single' && (
            <SingleSelect options={currentQuestion.options!} onSelect={handleAnswer} disabled={loading} />
          )}
          {currentQuestion.type === 'multi' && (
            <MultiSelect options={currentQuestion.options!} onConfirm={handleAnswer} disabled={loading} />
          )}
        </div>
      )}

      {/* Done CTA */}
      {done && (
        <div
          className="flex-shrink-0 px-6 py-4 flex gap-3 flex-wrap"
          style={{ borderTop: '1.5px solid rgba(0,0,0,0.07)', background: '#FAFAF8' }}
        >
          <button
            onClick={() => router.push(`/project/${projectId}/canvas`)}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white transition-all"
            style={{
              background: '#000', border: '2px solid #000',
              borderRadius: '10px', boxShadow: '3px 3px 0 0 #F5E642',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #F5E642'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
          >
            Open canvas <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {['Review stack', 'See page architecture', 'Agent tasks'].map(label => (
            <button
              key={label}
              className="px-4 py-2.5 text-[13px] font-semibold text-black transition-all"
              style={{
                border: '2px solid #000', borderRadius: '10px',
                background: '#fff', boxShadow: '3px 3px 0 0 #000',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 0 #000'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ role, text }: { role: 'ai' | 'user'; text: string }) {
  const isAI = role === 'ai'
  const formatted = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div
        className="max-w-[82%] px-4 py-3 text-[14px] leading-relaxed font-medium"
        style={isAI ? {
          background: '#F5F5F3',
          border: '1.5px solid rgba(0,0,0,0.08)',
          borderRadius: '16px',
          borderTopLeftRadius: 4,
          color: '#1a1a1a',
        } : {
          background: '#1a1a1a',
          borderRadius: '16px',
          borderTopRightRadius: 4,
          color: '#fff',
        }}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    </div>
  )
}
