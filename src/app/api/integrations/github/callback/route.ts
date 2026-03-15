import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

/**
 * GET /api/integrations/github/callback
 * Handles GitHub OAuth callback
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent('GitHub authorization was denied')}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent('Missing OAuth parameters')}`
    )
  }

  // Verify state token
  const storedState = req.cookies.get('github_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent('Invalid state token')}`
    )
  }

  // Parse state to get user ID
  let stateData: { userId: string; timestamp: number }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString())
  } catch {
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent('Invalid state format')}`
    )
  }

  // Check state hasn't expired (10 minutes)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent('OAuth session expired')}`
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('GitHub token error:', tokenData)
      return NextResponse.redirect(
        `${appUrl}/settings?error=${encodeURIComponent(tokenData.error_description || 'Failed to get access token')}`
      )
    }

    const accessToken = tokenData.access_token
    const scope = tokenData.scope

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      return NextResponse.redirect(
        `${appUrl}/settings?error=${encodeURIComponent('Failed to get GitHub user info')}`
      )
    }

    const githubUser = await userResponse.json()

    // Store integration in database
    const supabase = await createClient()

    // Verify the logged-in user matches the state
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        `${appUrl}/settings?error=${encodeURIComponent('User session mismatch')}`
      )
    }

    // Upsert the integration
    const { error: dbError } = await supabase
      .from('github_integrations')
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        github_user_id: githubUser.id,
        github_username: githubUser.login,
        github_avatar_url: githubUser.avatar_url,
        scopes: scope ? scope.split(',') : ['repo'],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (dbError) {
      console.error('Failed to store GitHub integration:', dbError)
      return NextResponse.redirect(
        `${appUrl}/settings?error=${encodeURIComponent('Failed to save integration')}`
      )
    }

    // Clear the state cookie
    const response = NextResponse.redirect(`${appUrl}/settings?github=connected`)
    response.cookies.delete('github_oauth_state')

    return response

  } catch (err) {
    console.error('GitHub OAuth callback error:', err)
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent('An unexpected error occurred')}`
    )
  }
}
