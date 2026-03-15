'use client'
import { useState } from 'react'
import type { DevTask } from '@/types'
import { Button } from '@/components/ui/button'
import { X, Download, Copy, Check } from 'lucide-react'

interface Props {
  tasks: DevTask[]
  projectId: string
  onClose: () => void
}

export function TaskExport({ tasks, projectId, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function downloadCursor() {
    setDownloading(true)
    const res = await fetch('/api/tasks/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, format: 'cursor' }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tasks.md'
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  async function copyJSON() {
    const res = await fetch('/api/tasks/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, format: 'json' }),
    })
    const json = await res.json()
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/30 flex justify-end">
      <div className="w-96 bg-background border-l h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-medium">Agent tasks</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{tasks.length} tasks ready to export</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Export buttons */}
        <div className="p-4 border-b flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={downloadCursor} disabled={downloading}>
            <Download className="w-3.5 h-3.5" />
            Download for Cursor (.md)
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={copyJSON}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.map((task, i) => (
            <div key={task.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground font-mono mt-0.5">#{i + 1}</span>
                <p className="text-sm font-medium leading-snug">{task.title}</p>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
              )}
              {task.acceptance_criteria.length > 0 && (
                <div className="space-y-1">
                  {task.acceptance_criteria.slice(0, 3).map((c, j) => (
                    <div key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                      {c}
                    </div>
                  ))}
                  {task.acceptance_criteria.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{task.acceptance_criteria.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks generated yet. Complete the spec builder to generate tasks.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
