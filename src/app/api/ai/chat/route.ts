import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { messages, nodeId, projectId, nodeContext } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const systemPrompt = `You are an AI product spec assistant embedded in a collaborative product canvas.

Current canvas node context:
- Node type: ${nodeContext.type}
- Node title: ${nodeContext.title}
- Node body: ${nodeContext.body || 'empty'}
- Evidence attached: ${JSON.stringify(nodeContext.evidence || [])}
- Project spec answers: ${JSON.stringify(nodeContext.specAnswers || {})}
- TinyFish signals: ${JSON.stringify(nodeContext.tinyfishReport?.results || [])}

Your job:
1. Answer questions about this specific node with precision
2. Propose concrete changes (schema updates, feature changes, UI changes) as structured suggestions
3. Detect conflicts between collaborators and propose resolutions
4. When you suggest something that should update the canvas, end with a JSON block:
   <suggestion>{"title":"...","body":"...","action":"apply_to_canvas","payload":{}}</suggestion>

Keep responses concise. Prioritise actionable over explanatory. Always ground suggestions in the TinyFish evidence signals when relevant.`

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
}
