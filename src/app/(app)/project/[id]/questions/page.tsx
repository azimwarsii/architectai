import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QuestionEngine } from '@/components/questions/QuestionEngine'

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

  return (
    <div className="h-screen flex flex-col">
      <QuestionEngine projectId={id} tinyfishReport={project.tinyfish_report} />
    </div>
  )
}
