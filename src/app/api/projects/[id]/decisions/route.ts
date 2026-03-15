import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects/[id]/decisions - Get all decisions for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: projectId } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has access to the project
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  const { data: collab } = await supabase
    .from('project_collaborators')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  const hasAccess = project?.user_id === user.id || collab

  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Parse query params for filtering
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') // 'all' | 'mine' | 'week'
  const search = searchParams.get('search')

  // Build query
  let query = supabase
    .from('decisions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filter === 'mine') {
    query = query.eq('created_by', user.id)
  } else if (filter === 'week') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    query = query.gte('created_at', weekAgo.toISOString())
  }

  // Apply search
  if (search) {
    query = query.or(`title.ilike.%${search}%,rationale.ilike.%${search}%`)
  }

  const { data: decisions, error } = await query

  if (error) {
    console.error('Failed to fetch decisions:', error)
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 })
  }

  // Fetch author information for each decision
  const authorIds = [...new Set(decisions?.map(d => d.created_by).filter(Boolean))]

  // Get user profiles (we'll use auth.users via a workaround or profiles table)
  // For now, return decisions without author info - the sidebar will handle display
  const decisionsWithAuthor = decisions?.map(d => ({
    ...d,
    // These will be populated client-side or via a profiles join if available
    author_name: null,
    author_email: null,
    author_avatar_url: null,
  }))

  return NextResponse.json({
    decisions: decisionsWithAuthor,
    total: decisions?.length || 0,
    filter,
    search,
  })
}
