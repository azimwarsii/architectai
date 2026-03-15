import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/extension/tasks/[id]/complete
 * Mark a task as complete from the browser extension
 * Optionally includes completion notes and artifacts
 */
export async function POST(
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

  try {
    const body = await req.json().catch(() => ({}))
    const {
      notes,
      artifacts,
      source,
      time_spent,
    } = body

    // Fetch the task
    const { data: task, error: taskError } = await supabase
      .from('dev_tasks')
      .select('*, projects!inner(id, user_id)')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify user has access to the project
    const projectData = task.projects as { id: string; user_id: string }
    const isOwner = projectData.user_id === user.id

    const { data: collab } = await supabase
      .from('project_collaborators')
      .select('role')
      .eq('project_id', projectData.id)
      .eq('user_id', user.id)
      .single()

    const canEdit = isOwner || (collab && ['owner', 'editor'].includes(collab.role))
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the task status
    const updateData: Record<string, unknown> = {
      status: 'done',
      updated_at: new Date().toISOString(),
    }

    // Add completion metadata if provided
    if (notes || artifacts || source || time_spent) {
      const completionMeta = {
        completed_by: user.id,
        completed_at: new Date().toISOString(),
        notes: notes || null,
        artifacts: artifacts || [],
        source: source || null,
        time_spent: time_spent || null,
      }

      // Store in agent_format field or a new metadata field
      updateData.agent_format = {
        ...(task.agent_format || {}),
        completion: completionMeta,
      }
    }

    const { error: updateError } = await supabase
      .from('dev_tasks')
      .update(updateData)
      .eq('id', taskId)

    if (updateError) {
      console.error('Failed to update task:', updateError)
      return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
    }

    // Log a decision for the completion
    await supabase.from('decisions').insert({
      project_id: projectData.id,
      title: `Task completed: ${task.title}`,
      rationale: notes || `Completed via ${source || 'extension'}`,
      status: 'approved',
      created_by: user.id,
    })

    // If the task has a related node, update its status too
    if (task.node_id) {
      await supabase
        .from('canvas_nodes')
        .update({ status: 'resolved' })
        .eq('id', task.node_id)
    }

    return NextResponse.json({
      success: true,
      task: {
        id: taskId,
        title: task.title,
        status: 'done',
      },
      message: 'Task marked as complete',
    })
  } catch (error) {
    console.error('Task completion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
