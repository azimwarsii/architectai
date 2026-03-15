import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/extension/project/[id]
 * Get detailed project information for the browser extension
 * Includes nodes, tasks, and recent decisions for context
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: projectId } = await params

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

  // Verify user has access to the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Check access
  const isOwner = project.user_id === user.id
  const { data: collab } = await supabase
    .from('project_collaborators')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!isOwner && !collab) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Fetch related data
  const [nodesResult, tasksResult, decisionsResult] = await Promise.all([
    supabase
      .from('canvas_nodes')
      .select('id, type, title, body, status, evidence')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('dev_tasks')
      .select('id, title, description, status, acceptance_criteria')
      .eq('project_id', projectId)
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('decisions')
      .select('id, title, rationale, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Build context summary for AI tools
  const contextSummary = buildContextSummary(project, nodesResult.data || [], tasksResult.data || [])

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      domain: project.domain,
      spec_answers: project.spec_answers,
      recommended_stack: project.recommended_stack,
    },
    nodes: nodesResult.data || [],
    tasks: tasksResult.data || [],
    decisions: decisionsResult.data || [],
    context: contextSummary,
    role: isOwner ? 'owner' : collab?.role,
  })
}

function buildContextSummary(
  project: Record<string, unknown>,
  nodes: Array<{ type: string; title: string; body?: string }>,
  tasks: Array<{ title: string; description: string }>
): string {
  const parts: string[] = []

  parts.push(`Project: ${project.name}`)

  if (project.domain) {
    parts.push(`Domain: ${project.domain}`)
  }

  // Group nodes by type
  const nodesByType: Record<string, string[]> = {}
  nodes.forEach(n => {
    if (!nodesByType[n.type]) nodesByType[n.type] = []
    nodesByType[n.type].push(n.title)
  })

  if (Object.keys(nodesByType).length > 0) {
    parts.push('\nSpec Nodes:')
    Object.entries(nodesByType).forEach(([type, titles]) => {
      parts.push(`- ${type}: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? ` (+${titles.length - 3} more)` : ''}`)
    })
  }

  if (tasks.length > 0) {
    parts.push('\nPending Tasks:')
    tasks.slice(0, 5).forEach(t => {
      parts.push(`- ${t.title}`)
    })
  }

  const specAnswers = project.spec_answers as Record<string, unknown> | undefined
  if (specAnswers) {
    if (specAnswers.platform) parts.push(`\nPlatform: ${specAnswers.platform}`)
    if (specAnswers.users) parts.push(`Users: ${(specAnswers.users as string[]).join(', ')}`)
  }

  return parts.join('\n')
}
