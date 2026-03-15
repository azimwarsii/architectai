import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get all projects for the current user
 * Used by the browser extension to list available projects
 */
export async function GET(req: NextRequest) {
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
    // Get owned projects
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('id, name, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (ownedError) {
      console.error('Failed to fetch owned projects:', ownedError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    // Get collaborated projects
    const { data: collaborations, error: collabError } = await supabase
      .from('project_collaborators')
      .select('project_id, role, projects:project_id(id, name, status, created_at, updated_at)')
      .eq('user_id', user.id)

    if (collabError) {
      console.error('Failed to fetch collaborations:', collabError)
    }

    // Combine and format projects
    const collabProjects = (collaborations || [])
      .filter(c => c.projects)
      .map(c => ({
        ...(Array.isArray(c.projects) ? c.projects[0] : c.projects),
        role: c.role,
      }))

    const allProjects = [
      ...(ownedProjects || []).map(p => ({ ...p, role: 'owner' })),
      ...collabProjects,
    ]

    // Remove duplicates and sort by updated_at
    const uniqueProjects = Array.from(
      new Map(allProjects.map(p => [p.id, p])).values()
    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return NextResponse.json(uniqueProjects)
  } catch (error) {
    console.error('Projects fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
