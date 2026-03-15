import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// GET /api/projects/[id]/collaborators - List all collaborators and pending invites
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user has access to this project
  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Get collaborators
  const { data: collaborators, error: collabError } = await supabase
    .from('project_collaborators')
    .select('*')
    .eq('project_id', projectId)

  if (collabError) {
    return NextResponse.json({ error: collabError.message }, { status: 500 })
  }

  // Get pending invites (only for owner)
  let invites: Array<{ id: string; email: string; role: string; created_at: string; expires_at: string }> = []
  if (project.user_id === user.id) {
    const { data: inviteData } = await supabase
      .from('project_invites')
      .select('id, email, role, created_at, expires_at')
      .eq('project_id', projectId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())

    invites = inviteData || []
  }

  return NextResponse.json({
    collaborators: collaborators || [],
    invites,
    isOwner: project.user_id === user.id
  })
}

// POST /api/projects/[id]/collaborators - Invite a new collaborator
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, role } = await req.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
  }

  if (!['editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check if user is owner of the project
  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, name')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the project owner can invite collaborators' }, { status: 403 })
  }

  // Check if user is already a collaborator
  const { data: existingCollab } = await supabase
    .from('project_collaborators')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', (
      await supabase.from('auth.users').select('id').eq('email', email).single()
    ).data?.id || '')
    .single()

  if (existingCollab) {
    return NextResponse.json({ error: 'User is already a collaborator' }, { status: 409 })
  }

  // Check if there's already a pending invite for this email
  const { data: existingInvite } = await supabase
    .from('project_invites')
    .select('id')
    .eq('project_id', projectId)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) {
    return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 409 })
  }

  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex')

  // Create invite
  const { data: invite, error } = await supabase
    .from('project_invites')
    .insert({
      project_id: projectId,
      email: email.toLowerCase(),
      role,
      token,
      invited_by: user.id
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Send email with invite link
  // For now, return the invite link directly
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

  return NextResponse.json({
    invite,
    inviteUrl,
    message: `Invite created. Share this link with ${email}: ${inviteUrl}`
  })
}

// DELETE /api/projects/[id]/collaborators - Remove a collaborator or revoke invite
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const collaboratorId = searchParams.get('collaboratorId')
  const inviteId = searchParams.get('inviteId')

  // Check if user is owner
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const isOwner = project.user_id === user.id

  if (collaboratorId) {
    // Removing a collaborator
    const { data: collab } = await supabase
      .from('project_collaborators')
      .select('user_id, role')
      .eq('id', collaboratorId)
      .single()

    if (!collab) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 })
    }

    // Can't remove the owner
    if (collab.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove project owner' }, { status: 400 })
    }

    // Only owner can remove others, or users can remove themselves
    if (!isOwner && collab.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to remove this collaborator' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_collaborators')
      .delete()
      .eq('id', collaboratorId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (inviteId) {
    // Revoking an invite
    if (!isOwner) {
      return NextResponse.json({ error: 'Only owner can revoke invites' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_invites')
      .delete()
      .eq('id', inviteId)
      .eq('project_id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Must provide collaboratorId or inviteId' }, { status: 400 })
}
