import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!
const GITHUB_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/github/callback'

/**
 * GET /api/integrations/github/connect
 * Initiates GitHub OAuth flow - redirects to GitHub authorization
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate state token for CSRF protection
  const state = Buffer.from(JSON.stringify({
    userId: user.id,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(7),
  })).toString('base64')

  // Store state in session/cookie for verification
  const response = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?` +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&` +
    `scope=repo&` +
    `state=${state}`
  )

  // Set state cookie for verification in callback
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })

  return response
}

/**
 * POST /api/integrations/github/connect
 * Disconnect GitHub integration
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await req.json()

  if (action === 'disconnect') {
    // Remove the integration
    const { error } = await supabase
      .from('github_integrations')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to disconnect GitHub:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'GitHub disconnected' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

/**
 * DELETE /api/integrations/github/connect
 * Alternative disconnect endpoint
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('github_integrations')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to disconnect GitHub:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'GitHub disconnected' })
}
