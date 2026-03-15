import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { projectId, format } = await req.json()
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('dev_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'pending')

  if (!tasks) return Response.json({ error: 'No tasks' }, { status: 404 })

  if (format === 'cursor') {
    // Cursor .cursorrules / task format
    const output = tasks.map((t, i) => `## Task ${i + 1}: ${t.title}

${t.description}

### Requirements
${(t.acceptance_criteria as string[]).map((c: string) => `- ${c}`).join('\n')}

### Stack hints
${(t.agent_format?.stack_hints as string[] || []).map((s: string) => `- ${s}`).join('\n')}
`).join('\n---\n')

    return new Response(output, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': 'attachment; filename="tasks.md"' }
    })
  }

  if (format === 'json') {
    return Response.json(tasks.map(t => t.agent_format))
  }

  return Response.json(tasks)
}
