import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/extension/prompts
 * Save prompts captured from AI coding tools
 * Creates evidence nodes or attaches to existing nodes
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()

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
    const {
      project_id,
      node_id,
      task_id,
      prompt,
      response,
      source,
      url,
      metadata,
    } = await req.json()

    if (!project_id || !prompt) {
      return NextResponse.json(
        { error: 'project_id and prompt are required' },
        { status: 400 }
      )
    }

    // Verify user has access to the project
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', project_id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isOwner = project.user_id === user.id
    const { data: collab } = await supabase
      .from('project_collaborators')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    const canEdit = isOwner || (collab && ['owner', 'editor'].includes(collab.role))
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If attaching to an existing node, add as evidence
    if (node_id) {
      const { data: node, error: nodeError } = await supabase
        .from('canvas_nodes')
        .select('evidence')
        .eq('id', node_id)
        .single()

      if (nodeError || !node) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 })
      }

      const newEvidence = {
        quote: prompt.slice(0, 500),
        source: source || 'AI Prompt',
        url: url,
        response_preview: response?.slice(0, 200),
        captured_at: new Date().toISOString(),
      }

      const updatedEvidence = [...(node.evidence || []), newEvidence]

      const { error: updateError } = await supabase
        .from('canvas_nodes')
        .update({ evidence: updatedEvidence })
        .eq('id', node_id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update node' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'added_to_node',
        node_id,
        evidence: newEvidence,
      })
    }

    // If linked to a task, log the prompt as task evidence
    if (task_id) {
      const { data: task, error: taskError } = await supabase
        .from('dev_tasks')
        .select('evidence_refs')
        .eq('id', task_id)
        .single()

      if (taskError || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const newRef = {
        quote: prompt.slice(0, 500),
        source: source || 'AI Prompt',
        url: url,
        response_preview: response?.slice(0, 200),
        captured_at: new Date().toISOString(),
      }

      const updatedRefs = [...(task.evidence_refs || []), newRef]

      const { error: updateError } = await supabase
        .from('dev_tasks')
        .update({ evidence_refs: updatedRefs })
        .eq('id', task_id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'added_to_task',
        task_id,
        evidence: newRef,
      })
    }

    // Otherwise, create a new evidence node
    const title = generatePromptTitle(prompt)

    // Find a good position
    const { data: existingNodes } = await supabase
      .from('canvas_nodes')
      .select('position')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(1)

    let position = { x: 100, y: 100 }
    if (existingNodes && existingNodes.length > 0) {
      position = {
        x: existingNodes[0].position.x + 30,
        y: existingNodes[0].position.y + 120,
      }
    }

    const { data: newNode, error: createError } = await supabase
      .from('canvas_nodes')
      .insert({
        project_id,
        type: 'evidence',
        title,
        body: prompt,
        status: 'open',
        position,
        evidence: [
          {
            quote: response ? response.slice(0, 500) : prompt.slice(0, 500),
            source: source || 'AI Tool',
            url: url,
          },
        ],
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create node:', createError)
      return NextResponse.json({ error: 'Failed to create node' }, { status: 500 })
    }

    // Also log as a decision if it looks like a decision was made
    if (response && (
      prompt.toLowerCase().includes('should') ||
      prompt.toLowerCase().includes('which') ||
      prompt.toLowerCase().includes('best approach')
    )) {
      await supabase.from('decisions').insert({
        project_id,
        node_id: newNode.id,
        title: `AI: ${title}`,
        rationale: response.slice(0, 500),
        status: 'pending',
        created_by: user.id,
      })
    }

    return NextResponse.json({
      success: true,
      action: 'created_node',
      node: newNode,
    })
  } catch (error) {
    console.error('Prompt save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generatePromptTitle(prompt: string): string {
  // Take first line or first 60 characters
  const firstLine = prompt.split('\n')[0].trim()

  // Remove common prompt prefixes
  const cleaned = firstLine
    .replace(/^(please|can you|could you|help me|i need|i want)/i, '')
    .trim()

  if (cleaned.length <= 60) {
    return cleaned || 'AI Prompt'
  }

  return cleaned.slice(0, 57) + '...'
}
