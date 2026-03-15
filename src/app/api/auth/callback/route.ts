import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth callback handler
 * Handles both regular web app auth and extension auth
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const extensionRedirect = searchParams.get('extension_redirect')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url))
  }

  const supabase = await createClient()

  // Exchange code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('Auth callback error:', error)

    if (extensionRedirect) {
      // Redirect back to extension with error
      const redirectUrl = new URL(extensionRedirect)
      redirectUrl.searchParams.set('error', error?.message || 'Authentication failed')
      return NextResponse.redirect(redirectUrl.toString())
    }

    return NextResponse.redirect(new URL('/login?error=auth_failed', req.url))
  }

  // If this is an extension auth, redirect back to extension with tokens
  if (extensionRedirect) {
    const redirectUrl = new URL(extensionRedirect)
    redirectUrl.hash = `access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Regular web auth - redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', req.url))
}
