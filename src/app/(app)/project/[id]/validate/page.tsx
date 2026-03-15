'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScanLog } from '@/components/tinyfish/ScanLog'
import { ValidationReport } from '@/components/tinyfish/ValidationReport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ScanLine, ValidationResult } from '@/types'

export default function ValidatePage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [idea, setIdea] = useState('')
  const [domain, setDomain] = useState('')
  const [scanLines, setScanLines] = useState<ScanLine[]>([])
  const [results, setResults] = useState<ValidationResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState(false)

  async function startScan() {
    if (!idea.trim()) return
    setScanning(true)
    setScanLines([])
    setResults([])

    // Save idea to project
    await supabase
      .from('projects')
      .update({ raw_idea: idea, domain: domain || null, name: idea.slice(0, 60), status: 'questioning' })
      .eq('id', projectId)

    const res = await fetch('/api/tinyfish/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, domain }),
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
        } else if (data.type === 'results') {
          setResults(data.results)
        }
      }
    }

    setScanning(false)
    setDone(true)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium mb-1">Validate your idea</h1>
        <p className="text-sm text-muted-foreground">
          TinyFish will scan the web for real demand signals, competitor gaps, and user pain points.
        </p>
      </div>

      {!scanning && !done && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your idea</label>
            <Textarea
              placeholder="e.g. A real-time tracking app for peer-to-peer package delivery between travellers..."
              value={idea}
              onChange={e => setIdea(e.target.value)}
              className="min-h-24 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Domain / market (optional)</label>
            <Input
              placeholder="e.g. logistics, edtech, fintech..."
              value={domain}
              onChange={e => setDomain(e.target.value)}
            />
          </div>
          <Button onClick={startScan} disabled={!idea.trim()} className="w-full">
            Start validation scan
          </Button>
        </div>
      )}

      {(scanning || scanLines.length > 0) && (
        <div className="space-y-4">
          <ScanLog lines={scanLines} scanning={scanning} />
          {results.length > 0 && <ValidationReport results={results} />}
        </div>
      )}

      {done && (
        <div className="mt-6">
          <Button
            onClick={() => router.push(`/project/${projectId}/questions`)}
            className="w-full"
          >
            Continue to spec builder →
          </Button>
        </div>
      )}
    </div>
  )
}
