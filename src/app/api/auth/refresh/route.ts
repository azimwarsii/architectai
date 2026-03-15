import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Refresh access token using refresh token
 */
export async function POST(req: NextRequest) {
  try {
    const { refresh_token } = await req.json()

    if (!refresh_token) {
      return NextResponse.json({ error: 'refresh_token is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({ refresh_token })

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Failed to refresh token' }, { status: 401 })
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata,
      },
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
