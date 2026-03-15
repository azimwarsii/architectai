'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Lightbulb, Globe } from 'lucide-react'
import { useState } from 'react'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function choose(path: 'has_idea' | 'needs_idea') {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name: 'Untitled project', entry_path: path, status: 'intake' })
      .select()
      .single()

    if (data) {
      router.push(path === 'has_idea'
        ? `/project/${data.id}/validate`
        : `/project/${data.id}/ideate`
      )
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-medium mb-3">What brings you here today?</h1>
        <p className="text-muted-foreground text-sm">
          We'll tailor the experience to where you are in the process
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
        <Card
          className={`p-6 cursor-pointer hover:border-purple-400 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => choose('has_idea')}
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-4">
            <Lightbulb className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="font-medium mb-2">I have an idea</h2>
          <p className="text-sm text-muted-foreground">
            Validate it against real market signals, competitor gaps, and user complaints
          </p>
        </Card>

        <Card
          className={`p-6 cursor-pointer hover:border-teal-400 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => choose('needs_idea')}
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
            <Globe className="w-5 h-5 text-teal-600" />
          </div>
          <h2 className="font-medium mb-2">I need an idea</h2>
          <p className="text-sm text-muted-foreground">
            TinyFish surfs the web to find real unsolved problems in any space you care about
          </p>
        </Card>
      </div>
    </div>
  )
}
