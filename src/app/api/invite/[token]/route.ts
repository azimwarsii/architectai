import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/invite/[token] - Get invite details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  // Get invite details
  const { data: invite, error } = await supabase
    .from('project_invites')
    .select(`
      id,
      email,
      role,
      created_at,
      expires_at,
      accepted_at,
      project_id,
      projects:project_id (
        name
      )
    `)
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
  }

  // Extract project name from the joined data (can be object or array depending on Supabase)
  const projectData = invite.projects as unknown
  let projectName = 'Unknown Project'
  if (projectData && typeof projectData === 'object') {
    if (Array.isArray(projectData) && projectData.length > 0) {
      projectName = (projectData[0] as { name: string }).name || 'Unknown Project'
    } else if ('name' in projectData) {
      projectName = (projectData as { name: string }).name
    }
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      projectId: invite.project_id,
      projectName,
      expiresAt: invite.expires_at
    }
  })
}

// POST /api/invite/[token] - Accept invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Must be logged in to accept invite' }, { status: 401 })
  }

  // Get invite
  const { data: invite, error: inviteError } = await supabase
    .from('project_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
  }

  // Check if email matches (optional: can be strict or flexible)
  // For now, allow any logged-in user to accept
  // In production, you might want to verify: user.email === invite.email

  // Check if already a collaborator
  const { data: existingCollab } = await supabase
    .from('project_collaborators')
    .select('id')
    .eq('project_id', invite.project_id)
    .eq('user_id', user.id)
    .single()

  if (existingCollab) {
    // Already a collaborator, just mark invite as accepted
    await supabase
      .from('project_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({
      success: true,
      projectId: invite.project_id,
      message: 'You are already a collaborator on this project'
    })
  }

  // Add as collaborator
  const { error: collabError } = await supabase
    .from('project_collaborators')
    .insert({
      project_id: invite.project_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by,
      accepted_at: new Date().toISOString()
    })

  if (collabError) {
    return NextResponse.json({ error: collabError.message }, { status: 500 })
  }

  // Mark invite as accepted
  await supabase
    .from('project_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({
    success: true,
    projectId: invite.project_id,
    role: invite.role
  })
}
