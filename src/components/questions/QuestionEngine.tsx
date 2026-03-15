'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONS } from '@/lib/questions'
import type { SpecAnswers } from '@/types'
import { ChatBubble } from './ChatBubble'
import { SingleSelect } from './SingleSelect'
import { MultiSelect } from './MultiSelect'
import { SpecSummary } from './SpecSummary'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  tinyfishReport?: object
}

export function QuestionEngine({ projectId, tinyfishReport }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const chatRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([])
  const [answers, setAnswers] = useState<SpecAnswers>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeQuestions = QUESTIONS.filter(q => !q.skipIf?.(answers))
  const currentQuestion = activeQuestions[stepIndex]
  const progress = currentQuestion ? currentQuestion.progressPct : 100

  useEffect(() => {
    addMessage('ai', "Your idea has been validated by TinyFish. Before we build the spec, I need to understand your technical preferences — takes about 3 minutes.")
    setTimeout(() => {
      if (QUESTIONS[0]) addMessage('ai', QUESTIONS[0].message)
    }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    // Follow-up message if defined
    const followUp = q.followUp?.(answer, newAnswers)
    if (followUp) {
      await new Promise(r => setTimeout(r, 400))
      addMessage('ai', followUp)
      await new Promise(r => setTimeout(r, 600))
    }

    const nextIndex = stepIndex + 1
    const nextQuestions = QUESTIONS.filter(q => !q.skipIf?.(newAnswers))
    const nextQ = nextQuestions[nextIndex]

    if (!nextQ) {
      await finalise(newAnswers)
    } else {
      await new Promise(r => setTimeout(r, followUp ? 200 : 400))
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
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="px-5 py-3 border-b">
        <Progress value={progress} className="h-1 mb-1" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {stepIndex + 1} of {activeQuestions.length}</span>
          <span>{currentQuestion?.section || 'Complete'}</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} text={m.text} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {done && <SpecSummary answers={answers} />}
      </div>

      {/* Options */}
      {!done && currentQuestion && (
        <div className="px-5 py-4 border-t">
          {currentQuestion.type === 'single' && (
            <SingleSelect
              options={currentQuestion.options!}
              onSelect={handleAnswer}
              disabled={loading}
            />
          )}
          {currentQuestion.type === 'multi' && (
            <MultiSelect
              options={currentQuestion.options!}
              onConfirm={handleAnswer}
              disabled={loading}
            />
          )}
        </div>
      )}

      {/* CTA after done */}
      {done && (
        <div className="px-5 py-4 border-t flex gap-3 flex-wrap">
          {['Review stack', 'See page architecture', 'Jump to agent tasks', 'Open canvas'].map(label => (
            <button
              key={label}
              onClick={() => label === 'Open canvas'
                ? router.push(`/project/${projectId}/canvas`)
                : null
              }
              className="text-sm px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
