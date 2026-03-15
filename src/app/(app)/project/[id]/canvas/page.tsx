import { createClient } from '@/lib/supabase/server'
import { CanvasBoard } from '@/components/canvas/CanvasBoard'
import { redirect } from 'next/navigation'

export default async function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) redirect('/dashboard')

  const [{ data: nodes }, { data: edges }, { data: tasks }, { data: decisions }] = await Promise.all([
    supabase.from('canvas_nodes').select('*').eq('project_id', id),
    supabase.from('canvas_edges').select('*').eq('project_id', id),
    supabase.from('dev_tasks').select('*').eq('project_id', id),
    supabase.from('decisions').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ])

  return (
    <CanvasBoard
      project={project}
      initialNodes={nodes || []}
      initialEdges={edges || []}
      initialTasks={tasks || []}
      initialDecisions={decisions || []}
    />
  )
}
