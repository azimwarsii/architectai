import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuestionsPageClient } from '@/components/questions/QuestionsPageClient'

export default async function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) redirect('/dashboard')
  if (project.status === 'canvas') redirect(`/project/${id}/canvas`)

  return <QuestionsPageClient projectId={id} tinyfishReport={project.tinyfish_report} />
}
