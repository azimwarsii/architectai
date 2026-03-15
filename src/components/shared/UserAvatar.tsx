'use client'
import { useEffect, useState } from 'react'

export function UserAvatar() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        setEmail(user?.email ?? null)
      })
    })
  }, [])

  if (!email) return null

  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div
      className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium"
      title={email}
    >
      {initials}
    </div>
  )
}
