'use client'
import { useState, useEffect } from 'react'
import type { DevTask, GitHubRepo, GitHubIssue } from '@/types'
import { Button } from '@/components/ui/button'
import { X, Download, Copy, Check, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'

// GitHub icon component (lucide Github is deprecated)
const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

interface Props {
  tasks: DevTask[]
  projectId: string
  onClose: () => void
}

interface GitHubStatus {
  connected: boolean
  github_username?: string
  repos?: GitHubRepo[]
}

export function TaskExport({ tasks, projectId, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // GitHub state
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null)
  const [githubLoading, setGithubLoading] = useState(true)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{
    success: boolean
    issues?: GitHubIssue[]
    errors?: { taskId: string; error: string }[]
  } | null>(null)

  useEffect(() => {
    loadGithubStatus()
  }, [])

  async function loadGithubStatus() {
    setGithubLoading(true)
    try {
      const statusRes = await fetch('/api/integrations/github/status')
      const status = await statusRes.json()
      setGithubStatus(status)

      if (status.connected) {
        // Load repos
        const reposRes = await fetch('/api/integrations/github/export')
        if (reposRes.ok) {
          const data = await reposRes.json()
          setRepos(data.repos || [])
        }
      }
    } catch {
      setGithubStatus({ connected: false })
    }
    setGithubLoading(false)
  }

  async function exportToGithub() {
    if (!selectedRepo) return

    setExporting(true)
    setExportResult(null)

    try {
      const res = await fetch('/api/integrations/github/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          repoFullName: selectedRepo,
          labels: ['architectai', 'task'],
        }),
      })

      const result = await res.json()
      setExportResult(result)
    } catch {
      setExportResult({
        success: false,
        errors: [{ taskId: 'all', error: 'Failed to export to GitHub' }],
      })
    }

    setExporting(false)
  }

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
        <div className="p-4 border-b space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={downloadCursor} disabled={downloading}>
              <Download className="w-3.5 h-3.5" />
              Download for Cursor (.md)
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={copyJSON}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
          </div>

          {/* GitHub Export Section */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <GithubIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Export to GitHub Issues</span>
            </div>

            {githubLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading GitHub status...
              </div>
            ) : !githubStatus?.connected ? (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Connect GitHub to export issues</span>
                <a
                  href="/api/integrations/github/connect"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[#24292f] text-white rounded-md hover:bg-[#1a1e22] transition-colors"
                >
                  <GithubIcon className="w-3 h-3" />
                  Connect
                </a>
              </div>
            ) : exportResult?.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    Created {exportResult.issues?.length} issue{exportResult.issues?.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {exportResult.issues?.slice(0, 3).map((issue) => (
                  <a
                    key={issue.id}
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground">#{issue.number}</span>
                    <span className="text-xs font-medium flex-1 truncate">{issue.title}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                ))}
                {exportResult.issues && exportResult.issues.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{exportResult.issues.length - 3} more issues created
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {exportResult?.errors && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 text-red-700 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {exportResult.errors[0]?.error || 'Export failed'}
                    </span>
                  </div>
                )}
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full text-xs p-2 border rounded-md bg-background"
                >
                  <option value="">Select a repository...</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.private ? '(private)' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={exportToGithub}
                  disabled={!selectedRepo || exporting || tasks.length === 0}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <GithubIcon className="w-3.5 h-3.5" />
                      Create {tasks.length} Issue{tasks.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
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
