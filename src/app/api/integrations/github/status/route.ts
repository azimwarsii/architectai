import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/integrations/github/status
 * Check if user has GitHub connected and get integration details
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's GitHub integration
  const { data: integration, error } = await supabase
    .from('github_integrations')
    .select('github_username, github_avatar_url, scopes, created_at, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error || !integration) {
    return NextResponse.json({
      connected: false,
    })
  }

  return NextResponse.json({
    connected: true,
    github_username: integration.github_username,
    github_avatar_url: integration.github_avatar_url,
    scopes: integration.scopes,
    connected_at: integration.created_at,
    updated_at: integration.updated_at,
  })
}
