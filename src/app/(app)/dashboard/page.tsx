import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  const statusColor: Record<string, string> = {
    intake: 'bg-gray-100 text-gray-700',
    questioning: 'bg-purple-100 text-purple-700',
    canvas: 'bg-teal-100 text-teal-700',
    exported: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-medium">Your projects</h1>
        <Link href="/new"><Button>New project</Button></Link>
      </div>

      <div className="grid gap-4">
        {(projects || []).map(p => (
          <Link key={p.id} href={p.status === 'canvas' ? `/project/${p.id}/canvas` : `/project/${p.id}/questions`}>
            <Card className="p-5 hover:border-purple-300 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {p.raw_idea || p.domain || 'No description'}
                  </p>
                </div>
                <Badge className={statusColor[p.status] || ''}>{p.status}</Badge>
              </div>
            </Card>
          </Link>
        ))}

        {(!projects || projects.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">No projects yet</p>
            <Link href="/new"><Button>Start your first project</Button></Link>
          </div>
        )}
      </div>
    </div>
  )
}
