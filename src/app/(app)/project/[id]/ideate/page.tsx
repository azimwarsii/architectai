'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScanLog } from '@/components/tinyfish/ScanLog'
import { ProblemList } from '@/components/tinyfish/ProblemList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ScanLine, Problem } from '@/types'

export default function IdeatePage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [domain, setDomain] = useState('')
  const [focus, setFocus] = useState('')
  const [scanLines, setScanLines] = useState<ScanLine[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)

  async function startScan() {
    if (!domain.trim()) return
    setScanning(true)
    setScanLines([])
    setProblems([])

    const res = await fetch('/api/tinyfish/ideate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, focus }),
    })

    if (!res.body) { setScanning(false); return }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done: streamDone, value } = await reader.read()
      if (streamDone) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = JSON.parse(line.slice(6))
        if (data.type === 'scan_line') {
          setScanLines(prev => [...prev, data.line])
        } else if (data.type === 'problems') {
          setProblems(data.problems)
        }
      }
    }

    setScanning(false)
    setDone(true)
  }

  async function selectProblem(problem: Problem) {
    setSelectedProblem(problem)
    await supabase
      .from('projects')
      .update({
        raw_idea: problem.title,
        domain,
        name: problem.title.slice(0, 60),
        status: 'questioning',
      })
      .eq('id', projectId)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium mb-1">Find a problem worth solving</h1>
        <p className="text-sm text-muted-foreground">
          TinyFish will surf Reddit, HN, and review sites to surface real unsolved problems.
        </p>
      </div>

      {!scanning && !done && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Domain / market</label>
            <Input
              placeholder="e.g. freelancing, remote work, small business, healthcare..."
              value={domain}
              onChange={e => setDomain(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Focus area (optional)</label>
            <Input
              placeholder="e.g. invoicing, team communication, financial reporting..."
              value={focus}
              onChange={e => setFocus(e.target.value)}
            />
          </div>
          <Button onClick={startScan} disabled={!domain.trim()} className="w-full">
            Start discovery scan
          </Button>
        </div>
      )}

      {(scanning || scanLines.length > 0) && (
        <div className="space-y-4">
          <ScanLog lines={scanLines} scanning={scanning} />
          {problems.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Pick a problem to build around:</p>
              <ProblemList
                problems={problems}
                onSelect={selectProblem}
                selected={selectedProblem?.rank}
              />
            </div>
          )}
        </div>
      )}

      {selectedProblem && (
        <div className="mt-6">
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 mb-4">
            <p className="text-sm font-medium text-teal-800">Selected: {selectedProblem.title}</p>
            <p className="text-xs text-teal-600 mt-0.5">Opportunity score: {selectedProblem.opportunity_score}/100</p>
          </div>
          <Button
            onClick={() => router.push(`/project/${projectId}/questions`)}
            className="w-full"
          >
            Build spec for this problem →
          </Button>
        </div>
      )}
    </div>
  )
}
