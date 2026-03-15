import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { conflictNodeId, originalContent, conflictingContent, originalEditor, conflictingEditor } = await req.json()

    if (!conflictNodeId || !originalContent || !conflictingContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the conflict node to verify it exists and user has access
    const { data: conflictNode, error: nodeError } = await supabase
      .from('canvas_nodes')
      .select('*, projects!inner(id, user_id)')
      .eq('id', conflictNodeId)
      .single()

    if (nodeError || !conflictNode) {
      return NextResponse.json({ error: 'Conflict node not found' }, { status: 404 })
    }

    // Check access (project owner or collaborator)
    const { data: collab } = await supabase
      .from('project_collaborators')
      .select('role')
      .eq('project_id', conflictNode.project_id)
      .eq('user_id', user.id)
      .single()

    const isOwner = conflictNode.projects.user_id === user.id
    const hasAccess = isOwner || (collab && ['owner', 'editor'].includes(collab.role))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate AI resolution
    const prompt = `You are a product management AI assistant helping resolve a content conflict in a collaborative specification document.

Two team members have made different edits to the same content:

**Original Version** (by ${originalEditor || 'User A'}):
Title: ${originalContent.title}
${originalContent.body ? `Body: ${originalContent.body}` : ''}

**Conflicting Version** (by ${conflictingEditor || 'User B'}):
Title: ${conflictingContent.title}
${conflictingContent.body ? `Body: ${conflictingContent.body}` : ''}

Please analyze both versions and provide a merged resolution that:
1. Preserves the key intent and information from both versions
2. Resolves any contradictions by choosing the more specific or complete option
3. Maintains clarity and conciseness
4. If the changes are complementary, combine them intelligently

Respond in JSON format with:
{
  "resolvedTitle": "The merged/resolved title",
  "resolvedBody": "The merged/resolved body text",
  "rationale": "Brief explanation of how you resolved the conflict (2-3 sentences)"
}

Only respond with the JSON object, no other text.`

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
      maxTokens: 1000,
    })

    // Parse the AI response
    let resolution
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        resolution = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawResponse: text
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      resolution: {
        title: resolution.resolvedTitle,
        body: resolution.resolvedBody,
        rationale: resolution.rationale,
      },
    })
  } catch (error) {
    console.error('Conflict resolution error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    )
  }
}
