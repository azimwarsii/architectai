'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Sign in to ArchitectAI</h1>
          <p className="text-sm text-muted-foreground mt-1">Build better products, faster</p>
        </div>
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={login} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
        <Button className="w-full" variant="outline" onClick={loginWithGoogle}>
          Continue with Google
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          No account? <a href="/signup" className="underline hover:text-foreground">Sign up</a>
        </p>
      </div>
    </div>
  )
}
