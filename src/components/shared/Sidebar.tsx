'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Plus, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/new', icon: Plus, label: 'New project' },
  ]

  return (
    <div className="w-14 border-r bg-background flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center mb-4">
        <span className="text-white text-xs font-bold">A</span>
      </div>

      {navItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          title={label}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            pathname === href
              ? 'bg-purple-100 text-purple-700'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Icon className="w-4 h-4" />
        </Link>
      ))}

      <div className="mt-auto">
        <button
          onClick={signOut}
          title="Sign out"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
