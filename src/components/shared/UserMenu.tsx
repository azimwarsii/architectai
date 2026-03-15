'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, LogOut, ChevronDown, User } from 'lucide-react'

interface UserInfo {
  email: string
  name: string
  initials: string
}

export function UserMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        const email = user.email ?? ''
        const name = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || email.split('@')[0]
        const initials = name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
        setUser({ email, name, initials })
      })
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function signOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) {
    // Skeleton while loading
    return (
      <div
        className="w-8 h-8 rounded-lg animate-pulse"
        style={{ background: '#F0EDE8', border: '2px solid #000' }}
      />
    )
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 transition-all"
        style={{
          padding: '4px 8px 4px 4px',
          border: '2px solid #000',
          borderRadius: '10px',
          background: open ? '#F5E642' : '#fff',
          boxShadow: open ? '3px 3px 0px 0px #000' : '2px 2px 0px 0px #000',
        }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-black"
          style={{ background: '#F5E642', border: '1.5px solid #000' }}
        >
          {user.initials}
        </div>
        <span className="text-[12px] font-semibold text-black hidden sm:block max-w-[100px] truncate">
          {user.name}
        </span>
        <ChevronDown className={`w-3 h-3 text-black transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 z-50"
          style={{
            background: '#fff',
            border: '2px solid #000',
            borderRadius: '12px',
            boxShadow: '4px 4px 0px 0px #000',
            overflow: 'hidden',
          }}
        >
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: '2px solid #000', background: '#F0EDE8' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold text-black flex-shrink-0"
                style={{ background: '#F5E642', border: '2px solid #000' }}
              >
                {user.initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-black truncate">{user.name}</p>
                <p className="text-[11px] text-black/50 font-medium truncate" style={{ fontFamily: 'var(--font-geist-mono)' }}>{user.email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-black transition-colors w-full"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-black transition-colors w-full"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <User className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          {/* Sign out */}
          <div className="p-1.5" style={{ borderTop: '2px solid #000' }}>
            <button
              onClick={signOut}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors w-full"
              style={{ color: '#F4520E', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF3F0' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
