import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Create a new canvas node
 * Used by the browser extension to add nodes from captured context
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Support both cookie-based auth and Bearer token
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
    const { project_id, type, title, body, evidence, status, position } = await req.json()

    if (!project_id || !title) {
      return NextResponse.json({ error: 'project_id and title are required' }, { status: 400 })
    }

    // Verify user has access to the project
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', project_id)
      .single()

    const { data: collab } = await supabase
      .from('project_collaborators')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    const isOwner = project?.user_id === user.id
    const canEdit = isOwner || (collab && ['owner', 'editor'].includes(collab.role))

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Find a good position for the new node (offset from existing nodes)
    let nodePosition = position || { x: 100, y: 100 }

    if (!position) {
      const { data: existingNodes } = await supabase
        .from('canvas_nodes')
        .select('position')
        .eq('project_id', project_id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingNodes && existingNodes.length > 0) {
        const lastNode = existingNodes[0]
        nodePosition = {
          x: lastNode.position.x + 30,
          y: lastNode.position.y + 120,
        }
      }
    }

    // Create the node
    const { data: node, error } = await supabase
      .from('canvas_nodes')
      .insert({
        project_id,
        type: type || 'evidence',
        title,
        body: body || null,
        evidence: evidence || [],
        status: status || 'open',
        position: nodePosition,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create node:', error)
      return NextResponse.json({ error: 'Failed to create node' }, { status: 500 })
    }

    return NextResponse.json(node)
  } catch (error) {
    console.error('Node creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
