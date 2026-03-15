'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Check, X, Loader2 } from 'lucide-react'

interface InviteDetails {
  id: string
  email: string
  role: 'editor' | 'viewer'
  projectId: string
  projectName: string
  expiresAt: string
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const supabase = createClient()

  const [token, setToken] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  // Unwrap params
  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  // Check auth and fetch invite details
  useEffect(() => {
    if (!token) return

    async function init() {
      // Check if user is logged in
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      // Fetch invite details
      try {
        const res = await fetch(`/api/invite/${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Invalid invite')
        } else {
          setInvite(data.invite)
        }
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [token, supabase])

  async function acceptInvite() {
    if (!token || !user) return

    setAccepting(true)
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to accept invite')
        setAccepting(false)
        return
      }

      // Redirect to project canvas
      router.push(`/project/${data.projectId}/canvas`)
    } catch {
      setError('Failed to accept invite')
      setAccepting(false)
    }
  }

  function redirectToLogin() {
    // Store the invite URL to redirect back after login
    const returnUrl = `/invite/${token}`
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e14] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading invite...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0e14] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161720] rounded-2xl p-8 text-center border border-red-500/20">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Invalid Invite</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-zinc-200 rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!invite) return null

  return (
    <div className="min-h-screen bg-[#0d0e14] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#161720] rounded-2xl p-8 border border-white/10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">
            You&apos;re Invited!
          </h1>
          <p className="text-zinc-400">
            You&apos;ve been invited to collaborate on a project
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Project</span>
            <p className="text-zinc-100 font-medium">{invite.projectName}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Your Role</span>
            <p className="text-zinc-100 font-medium capitalize">{invite.role}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Invited Email</span>
            <p className="text-zinc-100 font-medium">{invite.email}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Expires</span>
            <p className="text-zinc-100 font-medium">
              {new Date(invite.expiresAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {user ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 text-center">
              Logged in as <span className="text-zinc-200">{user.email}</span>
            </p>
            <button
              onClick={acceptInvite}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Accept Invite
                </>
              )}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl font-medium transition-colors"
            >
              Decline
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 text-center">
              Please log in or sign up to accept this invite
            </p>
            <button
              onClick={redirectToLogin}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors"
            >
              Log In to Accept
            </button>
            <button
              onClick={() => router.push(`/signup?returnUrl=${encodeURIComponent(`/invite/${token}`)}`)}
              className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl font-medium transition-colors"
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
