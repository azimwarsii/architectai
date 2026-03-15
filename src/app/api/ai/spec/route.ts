import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateStackRecommendation, generateInitialNodes } from '@/lib/questions'
import type { SpecAnswers } from '@/types'

export async function POST(req: NextRequest) {
  const { projectId, answers }: { projectId: string; answers: SpecAnswers } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Generate stack recommendation locally
  const stack = generateStackRecommendation(answers)

  // Generate dev tasks via AI
  type TaskList = { tasks: Array<{ title: string; description: string; acceptance_criteria: string[]; stack_hints: string[] }> }
  const { object: rawObject } = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: z.object({
      tasks: z.array(z.object({
        title: z.string(),
        description: z.string(),
        acceptance_criteria: z.array(z.string()),
        stack_hints: z.array(z.string()),
      }))
    }),
    prompt: `Generate agent-ready development tasks for this product spec:
Spec answers: ${JSON.stringify(answers)}
Recommended stack: ${JSON.stringify(stack)}

Create 8-15 granular tasks covering: auth setup, core pages, data model, API routes, payments (if needed), real-time (if needed), testing.
Each task should be actionable by a single coding agent session.`,
  })
  const object = rawObject as TaskList

  // Save stack to project
  await supabase
    .from('projects')
    .update({ recommended_stack: stack, status: 'canvas' })
    .eq('id', projectId)

  // Create initial canvas nodes
  const initialNodes = generateInitialNodes(answers, projectId)
  if (initialNodes.length > 0) {
    await supabase.from('canvas_nodes').insert(initialNodes)
  }

  // Save dev tasks
  if (object.tasks.length > 0) {
    await supabase.from('dev_tasks').insert(
      object.tasks.map((t: TaskList['tasks'][0]) => ({
        project_id: projectId,
        title: t.title,
        description: t.description,
        acceptance_criteria: t.acceptance_criteria,
        agent_format: {
          title: t.title,
          context: t.description,
          requirements: t.acceptance_criteria,
          acceptance_criteria: t.acceptance_criteria,
          evidence: '',
          stack_hints: t.stack_hints,
        },
      }))
    )
  }

  return Response.json({ stack, taskCount: object.tasks.length })
}
