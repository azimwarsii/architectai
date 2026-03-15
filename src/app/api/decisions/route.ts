import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/decisions - Create a new decision
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { project_id, node_id, title, rationale, status } = await req.json()

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

    // Insert the decision
    const { data: decision, error } = await supabase
      .from('decisions')
      .insert({
        project_id,
        node_id: node_id || null,
        title,
        rationale: rationale || null,
        status: status || 'pending',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create decision:', error)
      return NextResponse.json({ error: 'Failed to create decision' }, { status: 500 })
    }

    // Return with author info
    return NextResponse.json({
      ...decision,
      author_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      author_email: user.email,
      author_avatar_url: user.user_metadata?.avatar_url,
    })
  } catch (error) {
    console.error('Decision creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
