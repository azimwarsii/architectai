import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/extension/tasks/[id]/context
 * Get detailed task context formatted for AI coding tools
 * Returns task details with evidence, related nodes, and stack hints
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: taskId } = await params

  // Support Bearer token auth for extension
  let user = null
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data } = await supabase.auth.getUser(token)
    user = data.user
  } else {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch the task
  const { data: task, error: taskError } = await supabase
    .from('dev_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Verify user has access to the project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, user_id, recommended_stack, spec_answers')
    .eq('id', task.project_id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const isOwner = project.user_id === user.id
  const { data: collab } = await supabase
    .from('project_collaborators')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (!isOwner && !collab) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Fetch related node if exists
  let relatedNode = null
  if (task.node_id) {
    const { data: node } = await supabase
      .from('canvas_nodes')
      .select('id, type, title, body, evidence')
      .eq('id', task.node_id)
      .single()
    relatedNode = node
  }

  // Fetch recent decisions for context
  const { data: decisions } = await supabase
    .from('decisions')
    .select('title, rationale')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Build the context for AI tools
  const context = buildTaskContext(task, project, relatedNode, decisions || [])

  return NextResponse.json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      acceptance_criteria: task.acceptance_criteria || [],
      evidence_refs: task.evidence_refs || [],
      status: task.status,
    },
    project: {
      id: project.id,
      name: project.name,
    },
    relatedNode,
    decisions: decisions || [],
    context,
    agentFormat: task.agent_format || buildAgentFormat(task, project, relatedNode),
  })
}

interface Task {
  title: string
  description: string
  acceptance_criteria?: string[]
  evidence_refs?: Array<{ quote: string; source: string }>
}

interface Project {
  name: string
  recommended_stack?: {
    frontend?: string
    backend?: string
    database?: string
    extras?: string[]
  }
  spec_answers?: {
    platform?: string
  }
}

interface Node {
  title: string
  body?: string
  evidence?: Array<{ quote: string; source: string }>
}

function buildTaskContext(
  task: Task,
  project: Project,
  relatedNode: Node | null,
  decisions: Array<{ title: string; rationale?: string }>
): string {
  const parts: string[] = []

  parts.push(`# Task: ${task.title}`)
  parts.push('')
  parts.push(`## Description`)
  parts.push(task.description)
  parts.push('')

  if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
    parts.push(`## Acceptance Criteria`)
    task.acceptance_criteria.forEach((c, i) => {
      parts.push(`${i + 1}. ${c}`)
    })
    parts.push('')
  }

  if (relatedNode) {
    parts.push(`## Related Spec Node: ${relatedNode.title}`)
    if (relatedNode.body) {
      parts.push(relatedNode.body)
    }
    parts.push('')
  }

  // Add evidence
  const allEvidence = [
    ...(task.evidence_refs || []),
    ...(relatedNode?.evidence || []),
  ]
  if (allEvidence.length > 0) {
    parts.push(`## Evidence & Research`)
    allEvidence.forEach(e => {
      parts.push(`- "${e.quote}" (${e.source})`)
    })
    parts.push('')
  }

  // Add stack hints
  if (project.recommended_stack) {
    parts.push(`## Tech Stack`)
    const stack = project.recommended_stack
    if (stack.frontend) parts.push(`- Frontend: ${stack.frontend}`)
    if (stack.backend) parts.push(`- Backend: ${stack.backend}`)
    if (stack.database) parts.push(`- Database: ${stack.database}`)
    if (stack.extras && stack.extras.length > 0) {
      parts.push(`- Extras: ${stack.extras.join(', ')}`)
    }
    parts.push('')
  }

  // Add recent decisions
  if (decisions.length > 0) {
    parts.push(`## Recent Decisions`)
    decisions.forEach(d => {
      parts.push(`- ${d.title}${d.rationale ? `: ${d.rationale}` : ''}`)
    })
    parts.push('')
  }

  return parts.join('\n')
}

function buildAgentFormat(
  task: Task,
  project: Project,
  relatedNode: Node | null
) {
  const allEvidence = [
    ...(task.evidence_refs || []),
    ...(relatedNode?.evidence || []),
  ]

  return {
    title: task.title,
    context: `${task.description}${relatedNode?.body ? `\n\nContext: ${relatedNode.body}` : ''}`,
    requirements: task.acceptance_criteria || [],
    acceptance_criteria: task.acceptance_criteria || [],
    evidence: allEvidence.map(e => `"${e.quote}" - ${e.source}`).join('\n'),
    stack_hints: project.recommended_stack
      ? [
          project.recommended_stack.frontend,
          project.recommended_stack.backend,
          project.recommended_stack.database,
          ...(project.recommended_stack.extras || []),
        ].filter(Boolean)
      : [],
  }
}
