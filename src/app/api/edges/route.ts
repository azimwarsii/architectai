import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { project_id, source_id, target_id } = await req.json()

  if (!project_id || !source_id || !target_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Prevent duplicate edges
  const { data: existing } = await supabase
    .from('canvas_edges')
    .select('id')
    .eq('project_id', project_id)
    .eq('source_id', source_id)
    .eq('target_id', target_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Edge already exists' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('canvas_edges')
    .insert({ project_id, source_id, target_id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing edge id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('canvas_edges')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
