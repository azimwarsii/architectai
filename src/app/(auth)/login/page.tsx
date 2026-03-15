'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function login() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
  }

  async function loginWithGoogle() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: 500,
    border: '2px solid #000',
    borderRadius: '12px',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'box-shadow 0.1s',
    boxSizing: 'border-box' as const,
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: 'var(--font-host-grotesk), ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Top bar */}
      <div className="border-b-2 border-black px-8 py-5 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#F5E642', border: '2px solid #000', boxShadow: '2px 2px 0px 0px #000' }}
        >
          <span className="text-[11px] font-bold text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>A</span>
        </div>
        <span className="text-[15px] font-bold tracking-tight text-black">ArchitectAI</span>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '2px solid #000', boxShadow: '6px 6px 0px 0px #000' }}
          >
            {/* Card header */}
            <div
              className="px-8 py-6"
              style={{ background: '#F5E642', borderBottom: '2px solid #000' }}
            >
              <span
                className="text-[11px] font-bold uppercase tracking-[0.15em] text-black/60 block mb-1"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Welcome back
              </span>
              <h1 className="text-[28px] font-extrabold tracking-tight text-black leading-none">
                Sign in
              </h1>
            </div>

            <div className="px-8 py-7 bg-white space-y-4">
              {/* Google */}
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 text-[14px] font-bold text-black transition-all"
                style={{
                  border: '2px solid #000',
                  borderRadius: '12px',
                  background: '#F0EDE8',
                  boxShadow: '3px 3px 0px 0px #000',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '5px 5px 0px 0px #000'; e.currentTarget.style.transform = 'translate(-1px,-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000'; e.currentTarget.style.transform = 'none' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-0.5 bg-black/10" />
                <span className="text-[12px] font-bold text-black/40 uppercase tracking-widest" style={{ fontFamily: 'var(--font-geist-mono)' }}>or</span>
                <div className="flex-1 h-0.5 bg-black/10" />
              </div>

              <div className="space-y-3">
                <input
                  style={inputStyle}
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                />
                <input
                  style={inputStyle}
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  onFocus={e => { e.currentTarget.style.boxShadow = '3px 3px 0px 0px #000' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              {error && (
                <div
                  className="px-4 py-3 rounded-xl text-[13px] font-semibold text-red-700"
                  style={{ background: '#FFF5F5', border: '2px solid #dc2626' }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={login}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 text-[15px] font-bold text-white transition-all disabled:opacity-60"
                style={{
                  background: '#F4520E',
                  border: '2px solid #000',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0px 0px #000',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '6px 6px 0px 0px #000'; e.currentTarget.style.transform = 'translate(-1px,-1px)' } }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000'; e.currentTarget.style.transform = 'none' }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="text-center text-[13px] font-medium text-black/50">
                No account?{' '}
                <Link href="/signup" className="font-bold text-black underline underline-offset-2">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
