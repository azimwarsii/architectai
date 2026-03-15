'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Lock, Trash2, CheckCircle2, Link2, ExternalLink, Loader2 } from 'lucide-react'

// GitHub icon component (lucide Github is deprecated)
const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)
import { UserMenu } from '@/components/shared/UserMenu'

interface GitHubStatus {
  connected: boolean
  github_username?: string
  github_avatar_url?: string
  connected_at?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // GitHub integration state
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null)
  const [githubLoading, setGithubLoading] = useState(true)
  const [githubDisconnecting, setGithubDisconnecting] = useState(false)
  const [githubMsg, setGithubMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        setEmail(user.email ?? '')
        setName(
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          user.email?.split('@')[0] || ''
        )
      })
    })

    // Load GitHub integration status
    loadGithubStatus()

    // Handle URL params for GitHub OAuth result
    const githubParam = searchParams.get('github')
    const errorParam = searchParams.get('error')

    if (githubParam === 'connected') {
      setGithubMsg({ ok: true, text: 'GitHub connected successfully!' })
      // Clear the URL param
      window.history.replaceState({}, '', '/settings')
      loadGithubStatus()
    }

    if (errorParam) {
      setGithubMsg({ ok: false, text: decodeURIComponent(errorParam) })
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  async function loadGithubStatus() {
    setGithubLoading(true)
    try {
      const res = await fetch('/api/integrations/github/status')
      const data = await res.json()
      setGithubStatus(data)
    } catch {
      setGithubStatus({ connected: false })
    }
    setGithubLoading(false)
  }

  async function disconnectGithub() {
    setGithubDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/github/connect', {
        method: 'DELETE',
      })
      if (res.ok) {
        setGithubStatus({ connected: false })
        setGithubMsg({ ok: true, text: 'GitHub disconnected' })
      } else {
        setGithubMsg({ ok: false, text: 'Failed to disconnect' })
      }
    } catch {
      setGithubMsg({ ok: false, text: 'Failed to disconnect' })
    }
    setGithubDisconnecting(false)
    setTimeout(() => setGithubMsg(null), 3000)
  }

  async function saveProfile() {
    setSavingProfile(true)
    setProfileMsg(null)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
    setSavingProfile(false)
    setProfileMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Profile updated!' })
    setTimeout(() => setProfileMsg(null), 3000)
  }

  async function changePassword() {
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return }
    if (newPw.length < 6) { setPwMsg({ ok: false, text: 'Password must be at least 6 characters' }); return }
    setSavingPw(true)
    setPwMsg(null)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) {
      setPwMsg({ ok: false, text: error.message })
    } else {
      setPwMsg({ ok: true, text: 'Password changed!' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => setPwMsg(null), 3000)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 500,
    border: '2px solid #000',
    borderRadius: '10px',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: 'var(--font-host-grotesk), ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Topbar */}
      <div className="border-b-2 border-black px-8 py-5 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#F5E642', border: '2px solid #000', boxShadow: '2px 2px 0px 0px #000' }}
            >
              <span className="text-[11px] font-bold text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>A</span>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-black">ArchitectAI</span>
          </Link>
          <span className="text-black/20 text-lg font-light">/</span>
          <span className="text-[14px] font-semibold text-black/60">Settings</span>
        </div>
        <UserMenu />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-black/50 hover:text-black mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>
          <h1 className="text-[32px] font-extrabold tracking-tight text-black leading-none">Settings</h1>
          <p className="text-[14px] text-black/50 font-medium mt-1.5">Manage your account</p>
        </div>

        {/* Profile section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '2px solid #000', boxShadow: '4px 4px 0px 0px #000' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: '#F5E642', borderBottom: '2px solid #000' }}
          >
            <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Profile
            </span>
          </div>
          <div className="px-6 py-6 space-y-4 bg-white">
            <div>
              <label className="block text-[12px] font-bold text-black/60 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                Display name
              </label>
              <input
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000' }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-black/60 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                Email
              </label>
              <input
                style={{ ...inputStyle, background: '#F0EDE8', color: 'rgba(0,0,0,0.5)', cursor: 'not-allowed' }}
                value={email}
                readOnly
              />
              <p className="text-[11px] text-black/40 font-medium mt-1" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                Email cannot be changed
              </p>
            </div>

            {profileMsg && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{
                  background: profileMsg.ok ? '#F0FDF4' : '#FFF5F5',
                  border: `2px solid ${profileMsg.ok ? '#16a34a' : '#dc2626'}`,
                  color: profileMsg.ok ? '#16a34a' : '#dc2626',
                }}
              >
                {profileMsg.ok && <CheckCircle2 className="w-4 h-4" />}
                {profileMsg.text}
              </div>
            )}

            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-50"
              style={{
                background: '#000',
                border: '2px solid #000',
                boxShadow: '3px 3px 0px 0px #F5E642',
                borderRadius: '10px',
              }}
              onMouseEnter={e => { if (!savingProfile) e.currentTarget.style.boxShadow = '5px 5px 0px 0px #F5E642' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #F5E642' }}
            >
              <Save className="w-3.5 h-3.5" />
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>

        {/* Password section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '2px solid #000', boxShadow: '4px 4px 0px 0px #000' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: '#F0EDE8', borderBottom: '2px solid #000' }}
          >
            <Lock className="w-3.5 h-3.5 text-black" />
            <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Change password
            </span>
          </div>
          <div className="px-6 py-6 space-y-4 bg-white">
            <div>
              <label className="block text-[12px] font-bold text-black/60 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                New password
              </label>
              <input
                style={inputStyle}
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min 6 characters"
                onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000' }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-black/60 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                Confirm new password
              </label>
              <input
                style={inputStyle}
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat password"
                onKeyDown={e => e.key === 'Enter' && changePassword()}
                onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000' }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            {pwMsg && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{
                  background: pwMsg.ok ? '#F0FDF4' : '#FFF5F5',
                  border: `2px solid ${pwMsg.ok ? '#16a34a' : '#dc2626'}`,
                  color: pwMsg.ok ? '#16a34a' : '#dc2626',
                }}
              >
                {pwMsg.ok && <CheckCircle2 className="w-4 h-4" />}
                {pwMsg.text}
              </div>
            )}

            <button
              onClick={changePassword}
              disabled={savingPw || !newPw}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white transition-all disabled:opacity-50"
              style={{
                background: '#000',
                border: '2px solid #000',
                boxShadow: '3px 3px 0px 0px #F0EDE8',
                borderRadius: '10px',
              }}
              onMouseEnter={e => { if (!savingPw) e.currentTarget.style.boxShadow = '5px 5px 0px 0px #F0EDE8' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #F0EDE8' }}
            >
              <Lock className="w-3.5 h-3.5" />
              {savingPw ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </div>

        {/* Integrations section */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '2px solid #000', boxShadow: '4px 4px 0px 0px #000' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: '#E0E7FF', borderBottom: '2px solid #000' }}
          >
            <Link2 className="w-3.5 h-3.5 text-black" />
            <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Integrations
            </span>
          </div>
          <div className="px-6 py-6 space-y-4 bg-white">
            {/* GitHub Integration */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl" style={{ background: '#F8F8F8', border: '1px solid #E5E5E5' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#24292f] flex items-center justify-center">
                  <GithubIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-black">GitHub</p>
                  {githubLoading ? (
                    <p className="text-[12px] text-black/50 font-medium">Loading...</p>
                  ) : githubStatus?.connected ? (
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-green-600 font-medium">Connected as @{githubStatus.github_username}</p>
                      {githubStatus.github_avatar_url && (
                        <img
                          src={githubStatus.github_avatar_url}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-[12px] text-black/50 font-medium">Export tasks as GitHub issues</p>
                  )}
                </div>
              </div>
              <div>
                {githubLoading ? (
                  <Loader2 className="w-4 h-4 text-black/30 animate-spin" />
                ) : githubStatus?.connected ? (
                  <button
                    onClick={disconnectGithub}
                    disabled={githubDisconnecting}
                    className="px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors"
                    style={{ border: '1.5px solid #dc2626', borderRadius: '8px', background: '#fff' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FFF5F5' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                  >
                    {githubDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : (
                  <a
                    href="/api/integrations/github/connect"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white transition-all"
                    style={{
                      background: '#24292f',
                      border: '1.5px solid #24292f',
                      borderRadius: '8px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1e22' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#24292f' }}
                  >
                    <GithubIcon className="w-3.5 h-3.5" />
                    Connect
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {githubMsg && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{
                  background: githubMsg.ok ? '#F0FDF4' : '#FFF5F5',
                  border: `2px solid ${githubMsg.ok ? '#16a34a' : '#dc2626'}`,
                  color: githubMsg.ok ? '#16a34a' : '#dc2626',
                }}
              >
                {githubMsg.ok && <CheckCircle2 className="w-4 h-4" />}
                {githubMsg.text}
              </div>
            )}

            <p className="text-[11px] text-black/40 font-medium" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Connect integrations to export tasks and sync with external tools
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '2px solid #dc2626', boxShadow: '4px 4px 0px 0px #dc2626' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: '#FFF5F5', borderBottom: '2px solid #dc2626' }}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-red-600" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Danger zone
            </span>
          </div>
          <div className="px-6 py-6 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-bold text-black">Delete account</p>
                <p className="text-[12px] text-black/50 font-medium mt-0.5">
                  Permanently delete your account and all projects. This cannot be undone.
                </p>
              </div>
              <button
                className="flex-shrink-0 px-4 py-2 text-[13px] font-bold text-red-600 transition-colors"
                style={{ border: '2px solid #dc2626', borderRadius: '10px', background: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FFF5F5' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                onClick={() => alert('Please contact support to delete your account.')}
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
