import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Extension authentication endpoint
 * Redirects to Supabase auth and handles the OAuth flow for the browser extension
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const redirectUrl = searchParams.get('redirect_url')

  if (!redirectUrl) {
    return NextResponse.json({ error: 'redirect_url is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get the Supabase auth URL
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback?extension_redirect=${encodeURIComponent(redirectUrl)}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return NextResponse.json({ error: error?.message || 'Failed to initialize auth' }, { status: 500 })
  }

  // Redirect to the auth provider
  return NextResponse.redirect(data.url)
}
