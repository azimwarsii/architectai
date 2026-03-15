import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DevTask, GitHubIssue, GitHubExportResult } from '@/types'

/**
 * GET /api/integrations/github/export
 * Get available repositories for export
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's GitHub integration
  const { data: integration } = await supabase
    .from('github_integrations')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
  }

  try {
    // Fetch user's repositories
    const reposResponse = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=50',
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!reposResponse.ok) {
      if (reposResponse.status === 401) {
        // Token might be expired, prompt reconnection
        return NextResponse.json({ error: 'GitHub token expired, please reconnect' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
    }

    const repos = await reposResponse.json()

    return NextResponse.json({
      repos: repos.map((repo: Record<string, unknown>) => ({
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        owner: (repo.owner as Record<string, string>).login,
        private: repo.private,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
      })),
      github_username: integration.github_username,
    })

  } catch (err) {
    console.error('Error fetching repos:', err)
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
  }
}

/**
 * POST /api/integrations/github/export
 * Create GitHub issues from tasks
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, repoFullName, taskIds, labels } = await req.json()

  if (!projectId || !repoFullName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get user's GitHub integration
  const { data: integration } = await supabase
    .from('github_integrations')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
  }

  // Get tasks to export
  let tasksQuery = supabase
    .from('dev_tasks')
    .select('*')
    .eq('project_id', projectId)

  if (taskIds && taskIds.length > 0) {
    tasksQuery = tasksQuery.in('id', taskIds)
  } else {
    tasksQuery = tasksQuery.eq('status', 'pending')
  }

  const { data: tasks, error: tasksError } = await tasksQuery

  if (tasksError || !tasks || tasks.length === 0) {
    return NextResponse.json({ error: 'No tasks found to export' }, { status: 404 })
  }

  // Get project info for context
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  const [owner, repo] = repoFullName.split('/')
  const createdIssues: GitHubIssue[] = []
  const errors: { taskId: string; error: string }[] = []

  // Create issues for each task
  for (const task of tasks as DevTask[]) {
    try {
      const issueBody = formatTaskAsIssueBody(task, project?.name)

      const issueResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: task.title,
            body: issueBody,
            labels: labels || ['architectai', 'task'],
          }),
        }
      )

      if (!issueResponse.ok) {
        const errorData = await issueResponse.json()
        errors.push({
          taskId: task.id,
          error: errorData.message || 'Failed to create issue',
        })
        continue
      }

      const issue = await issueResponse.json()

      createdIssues.push({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        html_url: issue.html_url,
        state: issue.state,
        labels: issue.labels.map((l: { name: string; color: string }) => ({
          name: l.name,
          color: l.color,
        })),
        created_at: issue.created_at,
      })

      // Update task status to exported
      await supabase
        .from('dev_tasks')
        .update({
          status: 'exported',
          github_issue_url: issue.html_url,
          github_issue_number: issue.number,
        })
        .eq('id', task.id)

    } catch (err) {
      console.error(`Error creating issue for task ${task.id}:`, err)
      errors.push({
        taskId: task.id,
        error: 'Unexpected error creating issue',
      })
    }
  }

  const result: GitHubExportResult = {
    success: createdIssues.length > 0,
    issues: createdIssues,
    errors: errors.length > 0 ? errors : undefined,
  }

  return NextResponse.json(result)
}

/**
 * Format a task as a GitHub issue body
 */
function formatTaskAsIssueBody(task: DevTask, projectName?: string): string {
  const sections: string[] = []

  // Header with project reference
  if (projectName) {
    sections.push(`> Exported from ArchitectAI project: **${projectName}**\n`)
  }

  // Description
  if (task.description) {
    sections.push(`## Description\n\n${task.description}`)
  }

  // Acceptance Criteria
  if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
    sections.push(`## Acceptance Criteria\n\n${task.acceptance_criteria.map(c => `- [ ] ${c}`).join('\n')}`)
  }

  // Evidence/Context
  if (task.evidence_refs && task.evidence_refs.length > 0) {
    const evidenceList = task.evidence_refs.map(e => {
      let item = `- ${e.quote}`
      if (e.source) item += ` *(${e.source})*`
      if (e.url) item += ` [link](${e.url})`
      return item
    }).join('\n')
    sections.push(`## Evidence & Context\n\n${evidenceList}`)
  }

  // Agent format hints
  if (task.agent_format) {
    const af = task.agent_format
    if (af.stack_hints && af.stack_hints.length > 0) {
      sections.push(`## Technical Notes\n\n**Stack hints:** ${af.stack_hints.join(', ')}`)
    }
    if (af.context) {
      sections.push(`\n**Context:** ${af.context}`)
    }
  }

  // Footer
  sections.push(`\n---\n*Created via [ArchitectAI](https://architectai.app)*`)

  return sections.join('\n\n')
}
